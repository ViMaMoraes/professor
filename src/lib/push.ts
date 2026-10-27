import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb, schema } from "./db";
import { chavePublicaDoJwk, requisicaoPush } from "./webpush";

/**
 * Notificações (Web Push). Precisa de um único secret: VAPID_PRIVATE_KEY, a chave privada em JSON (JWK),
 * gerada com `npm run vapid`. Sem ele, o site funciona normalmente, só sem notificações.
 */
function chavePrivada(): JsonWebKey | null {
  const texto = process.env.VAPID_PRIVATE_KEY;
  if (!texto) return null;
  try {
    const jwk = JSON.parse(texto) as JsonWebKey;
    return jwk.kty === "EC" && jwk.d && jwk.x && jwk.y ? jwk : null;
  } catch {
    return null;
  }
}

/** Chave pública (formato do navegador: 65 bytes, base64url) derivada da chave privada. */
export function chavePublicaVapid(): string | null {
  const jwk = chavePrivada();
  return jwk ? chavePublicaDoJwk(jwk) : null;
}

export type Notificacao = { title: string; body?: string; url?: string };

/**
 * Envia a notificação para todos os aparelhos inscritos dos alunos indicados.
 * Inscrições que o navegador já cancelou (404/410) são apagadas. Nunca lança erro: notificação é extra.
 */
export async function notificarAlunos(alunoIds: number[], notificacao: Notificacao) {
  const privateJWK = chavePrivada();
  if (!privateJWK || alunoIds.length === 0) return { enviadas: 0 };
  try {
    const db = await getDb();
    const inscricoes = await db.select().from(schema.pushInscricoes).where(inArray(schema.pushInscricoes.alunoId, alunoIds));
    const contato = process.env.VAPID_CONTATO || "mailto:contato@example.com";
    const resultados = await Promise.allSettled(
      inscricoes.map(async (i) => {
        const { endpoint, init } = await requisicaoPush(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          notificacao,
          privateJWK,
          contato,
        );
        const resposta = await fetch(endpoint, init);
        if (resposta.status === 404 || resposta.status === 410) {
          await db.delete(schema.pushInscricoes).where(eq(schema.pushInscricoes.id, i.id));
        }
        return resposta.ok;
      }),
    );
    for (const r of resultados) if (r.status === "rejected") console.error("[push]", r.reason);
    return { enviadas: resultados.filter((r) => r.status === "fulfilled" && r.value).length };
  } catch (erro) {
    console.error("[push]", erro);
    return { enviadas: 0 };
  }
}
