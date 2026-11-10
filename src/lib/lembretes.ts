import "server-only";

import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { agoraBrasilia, aulasParaLembrar, LEMBRETES, somarDiasAgenda } from "./agenda";
import { contaLiberada } from "./auth";
import { agendaDoPeriodo } from "./consultas";
import { getDb, schema } from "./db";
import { primeiroNome } from "./formato";
import { acessoDoMembro, filtroDeAlunos, podeVer } from "./permissoes";
import { notificarAlunos, notificarEquipe, notificarProfessores } from "./push";
import { ehEstudio } from "./planos";

const MAIOR_ANTECEDENCIA_DIAS = Math.ceil(Math.max(...LEMBRETES.map(([m]) => m)) / (24 * 60)) + 1;

/**
 * Roda a cada 15 minutos (agendamento do Cloudflare): avisa no celular os alunos que têm aula
 * (ou reposição) chegando, na antecedência que o professor escolheu. Cada aula é avisada uma vez só.
 */
export async function enviarLembretesDeAula(agora = new Date()) {
  const db = await getDb();
  const ag = agoraBrasilia(agora);
  // só vale a pena olhar professores com algum aluno que ativou as notificações
  const inscritos = await db
    .selectDistinct({ alunoId: schema.pushInscricoes.alunoId, professorId: schema.alunos.professorId })
    .from(schema.pushInscricoes)
    .innerJoin(schema.alunos, eq(schema.alunos.id, schema.pushInscricoes.alunoId));
  const porProfessor = Map.groupBy(inscritos, (i) => i.professorId);

  const enviados: string[] = [];
  for (const [professorId, alunosInscritos] of porProfessor) {
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, professorId) });
    if (!professor || !professor.lembreteMinutos || !contaLiberada(professor, ag.data)) continue;
    const comAparelho = new Set(alunosInscritos.map((a) => a.alunoId));
    const agenda = (await agendaDoPeriodo(professor, ag.data, somarDiasAgenda(ag.data, MAIOR_ANTECEDENCIA_DIAS))).filter((o) =>
      comAparelho.has(o.alunoId),
    );
    for (const aula of aulasParaLembrar(agenda, ag, professor.lembreteMinutos)) {
      // a chave inclui data e hora: reposição remarcada é avisada de novo no horário novo
      const chave = `${aula.chave}|${aula.data}|${aula.hora}`;
      const [novo] = await db.insert(schema.lembretesEnviados).values({ chave }).onConflictDoNothing().returning();
      if (!novo) continue;
      const dia =
        aula.data === ag.data
          ? "hoje"
          : aula.data === somarDiasAgenda(ag.data, 1)
            ? "amanhã"
            : `dia ${aula.data.slice(8, 10)}/${aula.data.slice(5, 7)}`;
      await notificarAlunos([aula.alunoId], {
        title: `${aula.tipo === "reposicao" ? "Sua reposição" : "Sua aula"} é ${dia} às ${aula.hora}`,
        body: `${aula.curso ? `Aula de ${aula.curso} com` : "Aula com"} ${primeiroNome(aula.professor ?? professor.nome)}. Se não puder ir, avise pelo app.`,
        url: "/portal",
      });
      enviados.push(`${aula.nome} ${aula.data} ${aula.hora}`);
    }
  }
  // limpeza: lembretes com mais de 3 dias já não servem para evitar repetição
  await db.delete(schema.lembretesEnviados).where(lt(schema.lembretesEnviados.criadoEm, sql`datetime('now', '-3 days')`));
  return { enviados };
}

/** Texto do resumo da manhã a partir das aulas do dia (ou null se não houver aula). */
function resumoDoDia(aulas: Awaited<ReturnType<typeof agendaDoPeriodo>>) {
  const doDia = aulas.filter((o) => o.desmarcada?.por !== "professor");
  if (doDia.length === 0) return null;
  const vao = doDia.filter((o) => !o.desmarcada);
  const naoVao = doDia.filter((o) => o.desmarcada);
  const lista = vao
    .slice(0, 6)
    .map((o) => `${o.nome.split(" ")[0]} ${o.hora ?? ""}${o.tipo === "reposicao" ? " (reposição)" : ""}`.trim())
    .join(", ");
  return {
    title: vao.length === 1 ? "Hoje: 1 aula" : `Hoje: ${vao.length} aulas`,
    body:
      (lista ? `${lista}${vao.length > 6 ? ` e mais ${vao.length - 6}` : ""}.` : "") +
      (naoVao.length ? ` Avisaram que não vêm: ${naoVao.map((o) => o.nome.split(" ")[0]).join(", ")}.` : ""),
    url: "/agenda",
  };
}

/**
 * De manhã (tarefa diária): resumo das aulas do dia para quem ativou as notificações. O dono recebe
 * todas as aulas da conta; cada pessoa da equipe (com a Agenda liberada), só as dos alunos dela.
 */
export async function avisarAulasDoDia(agora = new Date()) {
  const db = await getDb();
  const { data } = agoraBrasilia(agora);
  const aparelhos = await db
    .select({ professorId: schema.pushProfessores.professorId, membroId: schema.pushProfessores.membroId })
    .from(schema.pushProfessores);
  const ids = [...new Set(aparelhos.map((r) => r.professorId))];
  if (ids.length === 0) return { avisados: [] as string[] };
  const professores = await db
    .select()
    .from(schema.professores)
    .where(and(inArray(schema.professores.id, ids)));
  const avisados: string[] = [];
  for (const professor of professores) {
    if (!contaLiberada(professor, data)) continue;
    const daConta = aparelhos.filter((a) => a.professorId === professor.id);
    if (daConta.some((a) => a.membroId == null)) {
      const resumo = resumoDoDia(await agendaDoPeriodo(professor, data, data));
      if (resumo && (await notificarProfessores([professor.id], resumo)).enviadas) avisados.push(professor.nome);
    }
    // equipe do estúdio
    const membroIds = [...new Set(daConta.map((a) => a.membroId).filter((m): m is number => m != null))];
    if (membroIds.length === 0 || !ehEstudio(professor)) continue;
    const equipe = await db
      .select()
      .from(schema.membros)
      .where(and(inArray(schema.membros.id, membroIds), eq(schema.membros.ativo, true)));
    for (const membro of equipe) {
      const acesso = acessoDoMembro(membro);
      if (!podeVer(acesso, "agenda")) continue;
      const resumo = resumoDoDia(await agendaDoPeriodo({ ...professor, escopoMembro: filtroDeAlunos(acesso) }, data, data));
      if (resumo && (await notificarEquipe(professor.id, resumo, { membroIds: [membro.id] })).enviadas) avisados.push(membro.nome);
    }
  }
  return { avisados };
}
