"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarMaterial, listarAlunos } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { lerLinkDrive } from "@/lib/drive";
import { texto, type EstadoForm } from "@/lib/estado-form";

export async function salvarMaterial(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  if (id && !(await buscarMaterial(professor.id, id))) return { erro: "Material não encontrado." };

  const titulo = texto(dados, "titulo");
  const drive = lerLinkDrive(texto(dados, "link"));
  const paraTodos = dados.get("destino") === "todos";
  // só aceita alunos deste professor
  const meus = new Set((await listarAlunos(professor.id, { situacao: "todos" })).map((a) => a.id));
  const alunoIds = [...new Set(dados.getAll("alunos").map(Number))].filter((alunoId) => meus.has(alunoId));

  if (!drive) return { erro: "Cole o link de compartilhamento de um arquivo, pasta ou documento do Google Drive." };
  if (!titulo) return { erro: "Informe um título para o material." };
  if (!paraTodos && alunoIds.length === 0) return { erro: "Escolha pelo menos um aluno ou marque “Todos os alunos”." };

  const valores = {
    titulo,
    descricao: texto(dados, "descricao"),
    categoria: texto(dados, "categoria"),
    paraTodos,
    link: drive.link,
    tipoDrive: drive.tipo,
    driveId: drive.id,
  };

  let materialId = id;
  if (!materialId) {
    const [novo] = await db
      .insert(schema.materiais)
      .values({ ...valores, professorId: professor.id })
      .returning({ id: schema.materiais.id });
    materialId = novo.id;
  }
  // atualiza o material e troca a lista de alunos de uma vez (o D1 não tem transações, mas executa o batch junto)
  const vinculos = paraTodos ? [] : alunoIds.map((alunoId) => ({ materialId: materialId!, alunoId }));
  await db.batch([
    db
      .update(schema.materiais)
      .set(valores)
      .where(and(eq(schema.materiais.id, materialId), eq(schema.materiais.professorId, professor.id))),
    db.delete(schema.materiaisAlunos).where(eq(schema.materiaisAlunos.materialId, materialId)),
    ...(vinculos.length ? [db.insert(schema.materiaisAlunos).values(vinculos)] : []),
  ]);

  revalidatePath("/", "layout");
  redirect("/materiais");
}

export async function excluirMaterial(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.materiais).where(and(eq(schema.materiais.id, id), eq(schema.materiais.professorId, professor.id)));
  revalidatePath("/", "layout");
}
