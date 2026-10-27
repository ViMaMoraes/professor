"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { exigirProfessor } from "@/lib/auth";
import { listarAlunos } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { notificarAlunos } from "@/lib/push";

/** Envia um aviso: fica no app do aluno e chega como notificação em quem ativou. */
export async function enviarAviso(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const titulo = texto(dados, "titulo");
  const mensagem = texto(dados, "mensagem");
  const destino = dados.get("destino");
  if (!titulo) return { erro: "Informe o título do aviso." };
  if (titulo.length > 120) return { erro: "O título pode ter no máximo 120 caracteres." };
  if (mensagem && mensagem.length > 2000) return { erro: "A mensagem pode ter no máximo 2000 caracteres." };

  // só alunos ativos deste professor
  const ativos = await listarAlunos(professor.id);
  let alunoIds: number[];
  if (destino === "todos") {
    alunoIds = ativos.map((a) => a.id);
  } else if (destino === "instituicao") {
    const instituicaoId = Number(dados.get("instituicaoId"));
    alunoIds = ativos.filter((a) => a.instituicaoId === instituicaoId).map((a) => a.id);
    if (!instituicaoId) return { erro: "Escolha a instituição." };
    if (alunoIds.length === 0) return { erro: "Essa instituição não tem alunos ativos." };
  } else {
    const meus = new Set(ativos.map((a) => a.id));
    alunoIds = [...new Set(dados.getAll("alunos").map(Number))].filter((id) => meus.has(id));
    if (alunoIds.length === 0) return { erro: "Escolha pelo menos um aluno." };
  }

  const paraTodos = destino === "todos";
  const db = await getDb();
  const [aviso] = await db
    .insert(schema.avisos)
    .values({ professorId: professor.id, titulo, mensagem, paraTodos })
    .returning({ id: schema.avisos.id });
  if (!paraTodos) {
    await db.insert(schema.avisosAlunos).values(alunoIds.map((alunoId) => ({ avisoId: aviso.id, alunoId })));
  }

  const { enviadas } = await notificarAlunos(alunoIds, { title: titulo, body: mensagem ?? undefined, url: "/portal" });
  revalidatePath("/avisos");
  return {
    ok: enviadas
      ? `Aviso enviado. ${enviadas} ${enviadas === 1 ? "aparelho notificado" : "aparelhos notificados"}.`
      : "Aviso publicado. Ele aparece na área do aluno.",
  };
}

export async function excluirAviso(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.avisos).where(and(eq(schema.avisos.id, id), eq(schema.avisos.professorId, professor.id)));
  revalidatePath("/avisos");
}
