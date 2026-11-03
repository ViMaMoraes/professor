import "server-only";

import { eq } from "drizzle-orm";

import { contaLiberada } from "./auth";
import { financeiroDoMes } from "./consultas";
import { getDb, schema } from "./db";
import { nomeMes, somarMeses, type LinhaFinanceiro } from "./financeiro";
import { hojeISO, moeda, somarDias } from "./formato";
import { notificarProfessores } from "./push";

export type Pendencia = LinhaFinanceiro & { mes: string };

/** Meses olhados para trás atrás de mensalidades esquecidas (além do mês atual). */
const MESES_ANTERIORES = 3;

/**
 * O que cobrar agora: mensalidades em atraso (mês atual e os 3 anteriores) e as que vencem
 * nos próximos dias. Alimenta o Painel, o aviso do Financeiro e a notificação diária.
 */
export async function resumoCobranca(professorId: number, hoje: string, diaPadrao: number, diasAntes = 3) {
  const atual = hoje.slice(0, 7);
  const meses = Array.from({ length: MESES_ANTERIORES + 1 }, (_, i) => somarMeses(atual, i - MESES_ANTERIORES));
  const porMes = await Promise.all(meses.map((m) => financeiroDoMes(professorId, m, hoje, diaPadrao)));
  const atrasados: Pendencia[] = porMes.flatMap(({ linhas }, i) => linhas.filter((l) => l.situacao === "atrasado").map((l) => ({ ...l, mes: meses[i] })));
  const limite = somarDias(hoje, diasAntes);
  const vencendo: Pendencia[] = porMes[porMes.length - 1].linhas
    .filter((l) => l.faltaCentavos > 0 && l.situacao !== "atrasado" && l.vencimento <= limite)
    .map((l) => ({ ...l, mes: atual }));
  const soma = (lista: Pendencia[]) => lista.reduce((t, l) => t + l.faltaCentavos, 0);
  return { atrasados, vencendo, totalAtrasado: soma(atrasados), totalVencendo: soma(vencendo) };
}

const lista = (linhas: LinhaFinanceiro[]) =>
  linhas
    .slice(0, 4)
    .map((l) => `${l.pagador.nome} (${moeda(l.faltaCentavos)})`)
    .join(", ") + (linhas.length > 4 ? ` e mais ${linhas.length - 4}` : "");

/** Título e texto da notificação do dia: o que vence hoje e o que ficou em atraso ontem. */
export function textoAvisoMensalidades(venceHoje: LinhaFinanceiro[], atrasou: LinhaFinanceiro[]) {
  const title = venceHoje.length
    ? venceHoje.length === 1
      ? `Hoje vence a mensalidade de ${venceHoje[0].pagador.nome}`
      : `Hoje vencem ${venceHoje.length} mensalidades`
    : atrasou.length === 1
      ? `Mensalidade de ${atrasou[0].pagador.nome} em atraso`
      : `${atrasou.length} mensalidades em atraso`;
  const partes: string[] = [];
  if (venceHoje.length > 1 || (venceHoje.length === 1 && atrasou.length)) partes.push(`Vencem hoje: ${lista(venceHoje)}.`);
  if (venceHoje.length === 1 && !atrasou.length) partes.push(`${moeda(venceHoje[0].faltaCentavos)} · ${nomeMes(venceHoje[0].vencimento.slice(0, 7))}.`);
  if (atrasou.length) partes.push(`${venceHoje.length ? "Em atraso desde ontem" : "Venceu ontem"}: ${lista(atrasou)}.`);
  return { title, body: partes.join(" ") };
}

/**
 * Roda uma vez por dia (agendamento do Cloudflare): avisa cada professor, no celular, das mensalidades
 * que vencem hoje e das que ficaram em atraso ontem. Só para quem ativou as notificações.
 */
export async function avisarMensalidades(hoje = hojeISO()) {
  const db = await getDb();
  const ids = [...new Set((await db.select({ id: schema.pushProfessores.professorId }).from(schema.pushProfessores)).map((r) => r.id))];
  const ontem = somarDias(hoje, -1);
  const avisados: string[] = [];
  for (const id of ids) {
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, id) });
    if (!professor || !contaLiberada(professor, hoje)) continue;
    const meses = [...new Set([ontem.slice(0, 7), hoje.slice(0, 7)])];
    const linhas = (await Promise.all(meses.map((m) => financeiroDoMes(id, m, hoje, professor.diaVencimento)))).flatMap((f) => f.linhas);
    const venceHoje = linhas.filter((l) => l.vencimento === hoje && l.faltaCentavos > 0);
    const atrasou = linhas.filter((l) => l.vencimento === ontem && l.faltaCentavos > 0);
    if (!venceHoje.length && !atrasou.length) continue;

    const { title, body } = textoAvisoMensalidades(venceHoje, atrasou);
    const { enviadas } = await notificarProfessores([id], { title, body, url: "/financeiro?filtro=aberto" });
    if (enviadas) avisados.push(professor.nome);
  }
  return { avisados };
}
