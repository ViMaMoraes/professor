// Gera a chave das notificações (VAPID). Rode `npm run vapid` e cole a linha impressa como o secret
// VAPID_PRIVATE_KEY no Cloudflare (Workers → seu worker → Settings → Variables and Secrets).
// A chave pública é calculada a partir dela, não precisa guardar outra coisa.
async function main() {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const { kty, crv, x, y, d } = await crypto.subtle.exportKey("jwk", par.privateKey);
  console.log("\nVAPID_PRIVATE_KEY (guarde em segredo, não compartilhe):\n");
  console.log(JSON.stringify({ kty, crv, x, y, d }));
  console.log("\nNo .env.local (para testar localmente) use aspas simples: VAPID_PRIVATE_KEY='...'\n");
}

main();
