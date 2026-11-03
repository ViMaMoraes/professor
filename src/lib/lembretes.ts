import "server-only";

import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { agoraBrasilia, aulasParaLembrar, LEMBRETES, somarDiasAgenda } from "./agenda";
import { contaLiberada } from "./auth";
import { agendaDoPeriodo } from "./consultas";
import { getDb, schema } from "./db";
import { primeiroNome } from "./formato";
import { notificarAlunos, notificarProfessores } from "./push";

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
      const dia = aula.data === ag.data ? "hoje" : aula.data === somarDiasAgenda(ag.data, 1) ? "amanhã" : `dia ${aula.data.slice(8, 10)}/${aula.data.slice(5, 7)}`;
      await notificarAlunos([aula.alunoId], {
        title: `${aula.tipo === "reposicao" ? "Sua reposição" : "Sua aula"} é ${dia} às ${aula.hora}`,
        body: `Aula com ${primeiroNome(professor.nome)}. Se não puder ir, avise pelo app.`,
        url: "/portal",
      });
      enviados.push(`${aula.nome} ${aula.data} ${aula.hora}`);
    }
  }
  // limpeza: lembretes com mais de 3 dias já não servem para evitar repetição
  await db.delete(schema.lembretesEnviados).where(lt(schema.lembretesEnviados.criadoEm, sql`datetime('now', '-3 days')`));
  return { enviados };
}

/** De manhã (tarefa diária): resumo das aulas do dia para cada professor que ativou as notificações. */
export async function avisarAulasDoDia(agora = new Date()) {
  const db = await getDb();
  const { data } = agoraBrasilia(agora);
  const ids = [...new Set((await db.select({ id: schema.pushProfessores.professorId }).from(schema.pushProfessores)).map((r) => r.id))];
  if (ids.length === 0) return { avisados: [] as string[] };
  const professores = await db.select().from(schema.professores).where(and(inArray(schema.professores.id, ids)));
  const avisados: string[] = [];
  for (const professor of professores) {
    if (!contaLiberada(professor, data)) continue;
    const aulas = (await agendaDoPeriodo(professor, data, data)).filter((o) => o.desmarcada?.por !== "professor");
    if (aulas.length === 0) continue;
    const vao = aulas.filter((o) => !o.desmarcada);
    const naoVao = aulas.filter((o) => o.desmarcada);
    const lista = vao
      .slice(0, 6)
      .map((o) => `${o.nome.split(" ")[0]} ${o.hora ?? ""}${o.tipo === "reposicao" ? " (reposição)" : ""}`.trim())
      .join(", ");
    const { enviadas } = await notificarProfessores([professor.id], {
      title: vao.length === 1 ? "Hoje: 1 aula" : `Hoje: ${vao.length} aulas`,
      body:
        (lista ? `${lista}${vao.length > 6 ? ` e mais ${vao.length - 6}` : ""}.` : "") +
        (naoVao.length ? ` Avisaram que não vêm: ${naoVao.map((o) => o.nome.split(" ")[0]).join(", ")}.` : ""),
      url: "/agenda",
    });
    if (enviadas) avisados.push(professor.nome);
  }
  return { avisados };
}
