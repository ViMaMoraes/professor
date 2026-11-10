import fs from "node:fs";
import path from "node:path";

import { jwtVerify, SignJWT } from "jose";

import { PASTA_DADOS } from "./caminhos";

export type Sessao = { tipo: "professor" | "aluno"; id: number };

export const COOKIE_SESSAO = "sessao";
const DIA = 60 * 60 * 24;
/**
 * Quanto tempo o login dura: professor 30 dias; aluno 1 ano (ele entra sem senha e o que mais atrapalha
 * é ter que lembrar usuário e código de novo; o acesso some na hora se o professor tirar o usuário ou desativar).
 */
export const duracaoSessao = (tipo: Sessao["tipo"]) => (tipo === "aluno" ? 365 : 30) * DIA;

let chaveEmCache: Uint8Array | undefined;

/**
 * Usa SESSION_SECRET; sem ela (só fora da Cloudflare), gera uma chave e guarda em data/
 * para não derrubar as sessões a cada reinício.
 */
function chave() {
  if (chaveEmCache) return chaveEmCache;
  let segredo = process.env.SESSION_SECRET;
  if (!segredo && typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") {
    throw new Error("Defina o secret SESSION_SECRET: npx wrangler secret put SESSION_SECRET");
  }
  if (!segredo) {
    const arquivo = path.join(/*turbopackIgnore: true*/ PASTA_DADOS, ".session-secret");
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    if (!fs.existsSync(arquivo)) {
      fs.writeFileSync(arquivo, crypto.randomUUID() + crypto.randomUUID(), { mode: 0o600 });
    }
    segredo = fs.readFileSync(arquivo, "utf8").trim();
  }
  chaveEmCache = new TextEncoder().encode(segredo);
  return chaveEmCache;
}

export async function criarToken(sessao: Sessao) {
  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${duracaoSessao(sessao.tipo)}s`)
    .sign(chave());
}

export async function lerToken(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if ((payload.tipo === "professor" || payload.tipo === "aluno") && typeof payload.id === "number") {
      return { tipo: payload.tipo, id: payload.id };
    }
  } catch {
    // token inválido ou expirado
  }
  return null;
}

export const opcoesCookie = (tipo: Sessao["tipo"]) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: duracaoSessao(tipo),
});
