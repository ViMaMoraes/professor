"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido } from "@/lib/formato";

/** Adiciona (registroId = null) ou edita um registro do diário de aulas de um aluno deste professor. */
export async function salvarRegistroDiario(alunoId: number, registroId: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  if (!(await buscarAluno(professor.id, alunoId))) return { erro: "Aluno não encontrado." };

  const data = texto(dados, "data");
  const conteudo = texto(dados, "conteudo");
  const paraCasa = texto(dados, "paraCasa");
  if (!isoValido(data)) return { erro: "Informe a data da aula." };
  if (!conteudo) return { erro: "Descreva o conteúdo da aula." };
  if (conteudo.length > 4000 || (paraCasa?.length ?? 0) > 4000) return { erro: "Texto muito longo (máximo de 4000 caracteres)." };

  const valores = { data, conteudo, paraCasa, visivelAluno: dados.get("visivelAluno") === "on" };
  const db = await getDb();
  const { diario } = schema;
  if (registroId) {
    await db
      .update(diario)
      .set(valores)
      .where(and(eq(diario.id, registroId), eq(diario.alunoId, alunoId)));
  } else {
    await db.insert(diario).values({ ...valores, alunoId });
  }
  revalidatePath(`/alunos/${alunoId}`);
  return { ok: registroId ? "Registro atualizado." : "Aula registrada no diário." };
}

export async function excluirRegistroDiario(alunoId: number, registroId: number) {
  const professor = await exigirProfessor();
  if (!(await buscarAluno(professor.id, alunoId))) return;
  const db = await getDb();
  await db.delete(schema.diario).where(and(eq(schema.diario.id, registroId), eq(schema.diario.alunoId, alunoId)));
  revalidatePath(`/alunos/${alunoId}`);
}
