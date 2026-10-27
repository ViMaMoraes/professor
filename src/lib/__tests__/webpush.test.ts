import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { autorizacaoVapid, chavePublicaDoJwk, requisicaoPush } from "../webpush";

const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, n: number) => {
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  return crypto.createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, n);
};

/** Decifra como o navegador faria (RFC 8291), com o crypto do Node, independente da implementação. */
function decifrar(corpo: Uint8Array, aparelho: crypto.ECDH, segredo: Buffer) {
  const buf = Buffer.from(corpo);
  const salt = buf.subarray(0, 16);
  const tamanhoChave = buf[20];
  const publicaServidor = buf.subarray(21, 21 + tamanhoChave);
  const cifrado = buf.subarray(21 + tamanhoChave);
  const compartilhado = aparelho.computeSecret(publicaServidor);
  const ikm = hkdf(segredo, compartilhado, Buffer.concat([Buffer.from("WebPush: info\0"), aparelho.getPublicKey(), publicaServidor]), 32);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const decifrador = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  decifrador.setAuthTag(cifrado.subarray(-16));
  const claro = Buffer.concat([decifrador.update(cifrado.subarray(0, -16)), decifrador.final()]);
  expect(claro.at(-1)).toBe(2); // último registro
  return JSON.parse(claro.subarray(0, -1).toString());
}

describe("web push (aes128gcm + VAPID)", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);

  it("o aparelho consegue decifrar a mensagem", async () => {
    const aparelho = crypto.createECDH("prime256v1");
    aparelho.generateKeys();
    const segredo = crypto.randomBytes(16);
    const { endpoint, init } = await requisicaoPush(
      { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: aparelho.getPublicKey().toString("base64url"), auth: segredo.toString("base64url") } },
      { title: "Novo material", body: "Escalas", url: "/portal" },
      jwk,
      "mailto:t@e.com",
    );
    expect(endpoint).toBe("https://web.push.apple.com/abc");
    expect(init.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(decifrar(init.body, aparelho, segredo)).toEqual({ title: "Novo material", body: "Escalas", url: "/portal" });
  });

  it("JWT do VAPID assinado com a chave do site", async () => {
    const cabecalho = await autorizacaoVapid("https://fcm.googleapis.com/fcm/send/x", jwk, "mailto:t@e.com");
    const [, token, k] = cabecalho.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(chavePublicaDoJwk(jwk));
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "mailto:t@e.com" });
    const publica = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, format: "jwk" });
    expect(crypto.verify("sha256", Buffer.from(`${h}.${p}`), { key: publica, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("recusa endereço sem https", async () => {
    await expect(requisicaoPush({ endpoint: "http://x", keys: { p256dh: "a", auth: "b" } }, {}, jwk, "mailto:t@e.com")).rejects.toThrow();
  });
});
