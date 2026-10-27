/**
 * Web Push padrão (RFC 8291 "aes128gcm" + VAPID RFC 8292) só com WebCrypto, para rodar no Cloudflare Workers.
 * Funciona com os servidores de push do Chrome/Android, Firefox e Safari/iPhone.
 */

export type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

const texto = new TextEncoder();

export function deBase64Url(valor: string) {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export function paraBase64Url(bytes: Uint8Array) {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function juntar(...partes: Uint8Array[]): Bytes {
  const saida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    saida.set(p, i);
    i += p.length;
  }
  return saida;
}

type Bytes = Uint8Array<ArrayBuffer>;

async function hmac(chave: Bytes, dados: Bytes) {
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, dados));
}

/** HKDF de um bloco só (até 32 bytes), que é tudo o que o RFC 8291 usa. */
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, tamanho: number) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, juntar(info, new Uint8Array([1])))).slice(0, tamanho);
}

/** Chave pública VAPID (65 bytes, base64url) a partir da privada em JWK. */
export function chavePublicaDoJwk(jwk: JsonWebKey) {
  return paraBase64Url(juntar(new Uint8Array([4]), deBase64Url(jwk.x!), deBase64Url(jwk.y!)));
}

/** Cifra a mensagem para o aparelho (RFC 8291, um registro só). */
export async function cifrar(inscricao: Inscricao, mensagem: Bytes) {
  const publicaAparelho = deBase64Url(inscricao.keys.p256dh);
  const segredo = deBase64Url(inscricao.keys.auth);

  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const publicaLocal = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const chaveAparelho = await crypto.subtle.importKey("raw", publicaAparelho, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartilhado = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: chaveAparelho }, local.privateKey, 256));

  const ikm = await hkdf(segredo, compartilhado, juntar(texto.encode("WebPush: info\0"), publicaAparelho, publicaLocal), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, texto.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, texto.encode("Content-Encoding: nonce\0"), 12);

  const chave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marca o último (e único) registro
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, chave, juntar(mensagem, new Uint8Array([2]))));

  const tamanhoRegistro = new Uint8Array(4);
  new DataView(tamanhoRegistro.buffer).setUint32(0, 4096);
  return juntar(salt, tamanhoRegistro, new Uint8Array([publicaLocal.length]), publicaLocal, cifrado);
}

/** Cabeçalho Authorization do VAPID: um JWT ES256 assinado com a chave do site. */
export async function autorizacaoVapid(endpoint: string, jwk: JsonWebKey, contato: string) {
  const json = (valor: object) => paraBase64Url(texto.encode(JSON.stringify(valor)));
  const corpo = `${json({ typ: "JWT", alg: "ES256" })}.${json({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: contato,
  })}`;
  const chave = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const assinatura = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, texto.encode(corpo)));
  return `vapid t=${corpo}.${paraBase64Url(assinatura)}, k=${chavePublicaDoJwk(jwk)}`;
}

/** Monta a requisição para o servidor de push do navegador. */
export async function requisicaoPush(inscricao: Inscricao, conteudo: object, jwk: JsonWebKey, contato: string, ttl = 60 * 60 * 24) {
  if (!inscricao.endpoint.startsWith("https://")) throw new Error("O endereço de push precisa ser https.");
  return {
    endpoint: inscricao.endpoint,
    init: {
      method: "POST",
      headers: {
        Authorization: await autorizacaoVapid(inscricao.endpoint, jwk, contato),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttl),
        Urgency: "normal",
      },
      body: await cifrar(inscricao, texto.encode(JSON.stringify(conteudo))),
    } satisfies RequestInit,
  };
}
