import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb, schema } from "./db";
import { lerModulos } from "./permissoes";
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

type Aparelho = { endpoint: string; p256dh: string; auth: string };

/**
 * Envia a notificação para os aparelhos. `esquecer` apaga a inscrição que o navegador já cancelou (404/410).
 * Nunca lança erro: notificação é extra.
 */
async function enviar(aparelhos: Aparelho[], notificacao: Notificacao, esquecer: (endpoint: string) => Promise<unknown>) {
  const privateJWK = chavePrivada();
  if (!privateJWK || aparelhos.length === 0) return { enviadas: 0 };
  const contato = process.env.VAPID_CONTATO || "mailto:contato@example.com";
  const resultados = await Promise.allSettled(
    aparelhos.map(async (a) => {
      const { endpoint, init } = await requisicaoPush(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        notificacao,
        privateJWK,
        contato,
      );
      const resposta = await fetch(endpoint, init);
      if (resposta.status === 404 || resposta.status === 410) await esquecer(a.endpoint);
      return resposta.ok;
    }),
  );
  for (const r of resultados) if (r.status === "rejected") console.error("[push]", r.reason);
  return { enviadas: resultados.filter((r) => r.status === "fulfilled" && r.value).length };
}

/** Notifica os aparelhos inscritos dos alunos indicados. */
export async function notificarAlunos(alunoIds: number[], notificacao: Notificacao) {
  if (!chavePrivada() || alunoIds.length === 0) return { enviadas: 0 };
  try {
    const db = await getDb();
    const { pushInscricoes: t } = schema;
    const aparelhos = await db.select().from(t).where(inArray(t.alunoId, alunoIds));
    return await enviar(aparelhos, notificacao, (endpoint) => db.delete(t).where(eq(t.endpoint, endpoint)));
  } catch (erro) {
    console.error("[push]", erro);
    return { enviadas: 0 };
  }
}

/**
 * Notifica os aparelhos dos DONOS das contas indicadas (ex.: o master, o financeiro).
 * A equipe de um estúdio não recebe estas; para ela, `notificarEquipe`.
 */
export async function notificarProfessores(professorIds: number[], notificacao: Notificacao) {
  if (!chavePrivada() || professorIds.length === 0) return { enviadas: 0 };
  try {
    const db = await getDb();
    const { pushProfessores: t } = schema;
    const aparelhos = await db
      .select()
      .from(t)
      .where(and(inArray(t.professorId, professorIds), isNull(t.membroId)));
    return await enviar(aparelhos, notificacao, (endpoint) => db.delete(t).where(eq(t.endpoint, endpoint)));
  } catch (erro) {
    console.error("[push]", erro);
    return { enviadas: 0 };
  }
}

/**
 * Notifica os aparelhos de pessoas da equipe (só o que é das aulas, nunca o financeiro).
 * Só quem está ativo e tem a Agenda liberada; com `alunoId`, só quem vê esse aluno
 * (vê todos os alunos ou é professor dele).
 */
export async function notificarEquipe(
  professorId: number,
  notificacao: Notificacao,
  filtro: { alunoId?: number; membroIds?: number[] } = {},
) {
  if (!chavePrivada()) return { enviadas: 0 };
  try {
    const db = await getDb();
    const { pushProfessores: t, membros, alunoEquipe } = schema;
    const equipe = await db
      .select()
      .from(membros)
      .where(and(eq(membros.professorId, professorId), eq(membros.ativo, true)));
    let ids = equipe.filter((m) => lerModulos(m.modulos).includes("agenda")).map((m) => m.id);
    if (filtro.membroIds) ids = ids.filter((id) => filtro.membroIds!.includes(id));
    if (filtro.alunoId) {
      const doAluno = new Set(
        (await db.select({ id: alunoEquipe.membroId }).from(alunoEquipe).where(eq(alunoEquipe.alunoId, filtro.alunoId))).map((l) => l.id),
      );
      ids = ids.filter((id) => doAluno.has(id) || equipe.find((m) => m.id === id)?.todosAlunos);
    }
    if (ids.length === 0) return { enviadas: 0 };
    const aparelhos = await db
      .select()
      .from(t)
      .where(and(eq(t.professorId, professorId), inArray(t.membroId, ids)));
    return await enviar(aparelhos, notificacao, (endpoint) => db.delete(t).where(eq(t.endpoint, endpoint)));
  } catch (erro) {
    console.error("[push]", erro);
    return { enviadas: 0 };
  }
}
