"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { agoraBrasilia, DIAS_LONGOS, diaDaSemana, horaValida, minutosDe } from "@/lib/agenda";
import { exigirAlunoComProfessor, exigirProfessor } from "@/lib/auth";
import { agendaDoPeriodo, buscarAluno, cursosDaConta } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { dataBR, isoValido } from "@/lib/formato";
import { notificarAlunos, notificarEquipe, notificarProfessores } from "@/lib/push";

/** "quinta, 13/11" */
const diaCurto = (data: string) => `${DIAS_LONGOS[diaDaSemana(data)].toLowerCase()}, ${dataBR(data).slice(0, 5)}`;
/** Avisar o aluno com no mínimo esta antecedência, ou depois disso ele não consegue mais desmarcar pelo app. */
const ANTECEDENCIA_AVISO_ALUNO_MIN = 120;

function revalidar(alunoId: number) {
  revalidatePath("/agenda");
  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath("/portal");
  revalidatePath("/painel");
  revalidatePath("/chamada");
}

/** Professor desmarca uma aula fixa; a reposição vem marcada (desmarcar ela = sem reposição). */
export async function desmarcarAula(alunoId: number, data: string, hora: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("agenda");
  if (!(await buscarAluno(professor, alunoId)) || !isoValido(data)) return { erro: "Aula não encontrada." };
  // a aula (e o curso dela) dentro do que esta pessoa vê; a reposição fica no mesmo curso
  const aula = (await agendaDoPeriodo(professor, data, data, { alunoId })).find((o) => o.tipo === "aula" && (o.hora ?? "") === hora);
  if (!aula) return { erro: "Aula não encontrada." };
  const motivo = texto(dados, "motivo");
  const gerarReposicao = dados.get("reposicao") === "on";
  const db = await getDb();
  await db
    .insert(schema.aulasDesmarcadas)
    .values({ professorId: professor.id, alunoId, data, hora, por: "professor", motivo })
    .onConflictDoUpdate({
      target: [schema.aulasDesmarcadas.alunoId, schema.aulasDesmarcadas.data, schema.aulasDesmarcadas.hora],
      set: { por: "professor", motivo },
    });
  if (gerarReposicao) {
    await db.insert(schema.reposicoes).values({
      professorId: professor.id,
      alunoId,
      cursoId: aula.cursoId || null,
      motivo: `Aula de ${dataBR(data)}${aula.curso ? ` de ${aula.curso}` : ""} desmarcada pelo professor${motivo ? ` (${motivo})` : ""}`,
    });
  }
  await notificarAlunos([alunoId], {
    title: `Aula de ${diaCurto(data)} desmarcada`,
    body: [motivo, gerarReposicao ? "Vamos combinar a reposição." : null].filter(Boolean).join(" · ") || "O professor desmarcou esta aula.",
    url: "/portal",
  });
  revalidar(alunoId);
  return { ok: gerarReposicao ? "Aula desmarcada. A reposição ficou em “Reposições a marcar”." : "Aula desmarcada, sem reposição." };
}

/** Desfaz a marcação (a aula volta a acontecer). Reposição concedida continua; dá para cancelar à parte. */
export async function desfazerDesmarcada(id: number) {
  const professor = await exigirProfessor("agenda");
  const db = await getDb();
  const [apagada] = await db
    .delete(schema.aulasDesmarcadas)
    .where(and(eq(schema.aulasDesmarcadas.id, id), eq(schema.aulasDesmarcadas.professorId, professor.id)))
    .returning();
  if (apagada) revalidar(apagada.alunoId);
}

/** Concede uma reposição (ex.: o aluno faltou com atestado). Sempre decisão do professor. */
export async function concederReposicao(alunoId: number, cursoId: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("agenda");
  if (!(await buscarAluno(professor, alunoId))) return { erro: "Aluno não encontrado." };
  // estúdio: de qual curso é a reposição (o que veio da aula, ou o escolhido); só cursos que esta pessoa vê
  const cursos = await cursosDaConta(professor, { alunoId });
  const escolhido = Number(dados.get("cursoId")) || cursoId;
  const curso = cursos.find((c) => c.id === escolhido) ?? (cursos.length === 1 ? cursos[0] : undefined);
  if (cursos.length > 1 && !curso) return { erro: "Escolha o curso da reposição." };
  const db = await getDb();
  await db.insert(schema.reposicoes).values({ professorId: professor.id, alunoId, cursoId: curso?.id ?? null, motivo: texto(dados, "motivo") });
  revalidar(alunoId);
  return { ok: "Reposição concedida. Agora é só agendar." };
}

/** Marca (ou remarca) dia e hora da reposição e avisa o aluno. */
export async function agendarReposicao(id: number, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("agenda");
  const data = texto(dados, "data");
  const hora = texto(dados, "hora");
  if (!isoValido(data)) return { erro: "Escolha o dia da reposição." };
  if (!horaValida(hora)) return { erro: "Escolha o horário da reposição." };
  const duracao = Number(dados.get("duracao")) || null;
  const db = await getDb();
  const [r] = await db
    .update(schema.reposicoes)
    .set({ data, hora, duracaoMin: duracao })
    .where(and(eq(schema.reposicoes.id, id), eq(schema.reposicoes.professorId, professor.id)))
    .returning();
  if (!r) return { erro: "Reposição não encontrada." };
  await notificarAlunos([r.alunoId], { title: "Reposição marcada", body: `${diaCurto(data)} às ${hora}`, url: "/portal" });
  revalidar(r.alunoId);
  return { ok: `Reposição marcada para ${diaCurto(data)} às ${hora}.` };
}

/** Tira a data da reposição (volta para "a marcar"). */
export async function desagendarReposicao(id: number) {
  const professor = await exigirProfessor("agenda");
  const db = await getDb();
  const [r] = await db
    .update(schema.reposicoes)
    .set({ data: null, hora: null })
    .where(and(eq(schema.reposicoes.id, id), eq(schema.reposicoes.professorId, professor.id)))
    .returning();
  if (r) revalidar(r.alunoId);
}

/** Cancela a reposição (o aluno deixa de ter direito a ela). */
export async function excluirReposicao(id: number) {
  const professor = await exigirProfessor("agenda");
  const db = await getDb();
  const [r] = await db
    .delete(schema.reposicoes)
    .where(and(eq(schema.reposicoes.id, id), eq(schema.reposicoes.professorId, professor.id)))
    .returning();
  if (r) revalidar(r.alunoId);
}

/**
 * Aluno avisa pelo app que não vai a uma aula fixa. Não gera reposição: o professor é avisado e decide.
 * Só até 2 horas antes da aula.
 */
export async function avisarFalta(data: string, hora: string): Promise<{ erro?: string; ok?: string }> {
  const { aluno, professor } = await exigirAlunoComProfessor();
  const aula = (await agendaDoPeriodo(professor, data, data, { alunoId: aluno.id })).find(
    (o) => o.tipo === "aula" && (o.hora ?? "") === hora && !o.desmarcada,
  );
  if (!aula) return { erro: "Aula não encontrada." };
  const agora = agoraBrasilia();
  if (aula.hora) {
    const faltam = (Date.parse(`${data}T00:00:00Z`) - Date.parse(`${agora.data}T00:00:00Z`)) / 60000 + minutosDe(aula.hora) - agora.minutos;
    if (faltam < ANTECEDENCIA_AVISO_ALUNO_MIN) return { erro: "Falta menos de 2 horas para a aula. Avise o professor diretamente." };
  }
  const db = await getDb();
  await db
    .insert(schema.aulasDesmarcadas)
    .values({ professorId: professor.id, alunoId: aluno.id, data, hora, por: "aluno" })
    .onConflictDoNothing();
  const falta = {
    title: `${aluno.nome} não vai à aula`,
    body: `Aula de ${diaCurto(data)}${aula.hora ? ` às ${aula.hora}` : ""}. A reposição fica a seu critério.`,
    url: "/agenda",
  };
  // o dono e o professor do curso dessa aula (aula sem curso: quem da equipe vê esse aluno)
  const deQuem = aula.membroId ? { membroIds: [aula.membroId] } : { alunoId: aluno.id };
  await Promise.all([notificarProfessores([professor.id], falta), notificarEquipe(professor.id, falta, deQuem)]);
  revalidar(aluno.id);
  return { ok: "Pronto, o professor foi avisado." };
}

/** Aluno desfaz o próprio aviso ("vou poder ir sim"). */
export async function desfazerAvisoFalta(data: string, hora: string): Promise<{ erro?: string; ok?: string }> {
  const { aluno, professor } = await exigirAlunoComProfessor();
  const db = await getDb();
  const { aulasDesmarcadas: d } = schema;
  await db.delete(d).where(and(eq(d.alunoId, aluno.id), eq(d.data, data), eq(d.hora, hora), eq(d.por, "aluno")));
  const vai = { title: `${aluno.nome} vai à aula`, body: `Aula de ${diaCurto(data)} confirmada de novo.`, url: "/agenda" };
  await Promise.all([notificarProfessores([professor.id], vai), notificarEquipe(professor.id, vai, { alunoId: aluno.id })]);
  revalidar(aluno.id);
  return { ok: "Combinado, aula confirmada." };
}
