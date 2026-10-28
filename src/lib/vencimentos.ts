import "server-only";

import { and, eq, gte, isNotNull, lte } from "drizzle-orm";

import { getDb, schema } from "./db";
import type { Professor } from "./db/schema";
import { dataBR, hojeISO, somarDias } from "./formato";
import { notificarProfessores } from "./push";

/** Com quantos dias de antecedência o master é avisado do vencimento de um professor. */
export const DIAS_AVISO_VENCIMENTO = 2;

/** Dias até o vencimento (0 = vence hoje; negativo = já venceu). */
export function diasAte(data: string, hoje = hojeISO()) {
  return Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);
}

export function textoVencimento(dias: number) {
  if (dias <= 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

/** Aviso ainda não enviado para esta data de vencimento, que cai dentro da antecedência. */
export function precisaAvisar(p: Pick<Professor, "master" | "ativo" | "acessoAte" | "vencimentoAvisado">, hoje = hojeISO()) {
  if (p.master || !p.ativo || !p.acessoAte || p.vencimentoAvisado === p.acessoAte) return false;
  const dias = diasAte(p.acessoAte, hoje);
  return dias >= 0 && dias <= DIAS_AVISO_VENCIMENTO;
}

/**
 * Roda uma vez por dia (agendamento do Cloudflare): avisa o master, no celular, dos professores
 * cujo acesso vence nos próximos dias. Cada data de vencimento gera um aviso só; se o master ainda
 * não tem aparelho com notificação ativada, tenta de novo no dia seguinte.
 */
export async function avisarVencimentos(hoje = hojeISO()) {
  const db = await getDb();
  const { professores } = schema;
  const candidatos = await db
    .select()
    .from(professores)
    .where(
      and(
        eq(professores.master, false),
        eq(professores.ativo, true),
        isNotNull(professores.acessoAte),
        gte(professores.acessoAte, hoje),
        lte(professores.acessoAte, somarDias(hoje, DIAS_AVISO_VENCIMENTO)),
      ),
    );
  const pendentes = candidatos.filter((p) => precisaAvisar(p, hoje));
  if (pendentes.length === 0) return { avisados: [] as string[] };

  const masters = (await db.select({ id: professores.id }).from(professores).where(eq(professores.master, true))).map((m) => m.id);
  const avisados: string[] = [];
  for (const p of pendentes) {
    const { enviadas } = await notificarProfessores(masters, {
      title: `Acesso de ${p.nome} ${textoVencimento(diasAte(p.acessoAte!, hoje))}`,
      body: `Vencimento em ${dataBR(p.acessoAte)}. Hora de fazer a cobrança e renovar.`,
      url: `/admin/${p.id}`,
    });
    if (enviadas > 0) {
      await db.update(professores).set({ vencimentoAvisado: p.acessoAte }).where(eq(professores.id, p.id));
      avisados.push(p.nome);
    }
  }
  return { avisados };
}
