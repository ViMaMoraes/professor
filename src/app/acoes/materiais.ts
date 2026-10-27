"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { lerLinkDrive } from "@/lib/drive";
import { texto, type EstadoForm } from "@/lib/estado-form";

export async function salvarMaterial(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirProfessor();
  const db = await getDb();

  const titulo = texto(dados, "titulo");
  const drive = lerLinkDrive(texto(dados, "link"));
  const paraTodos = dados.get("destino") === "todos";
  const alunoIds = [...new Set(dados.getAll("alunos").map(Number).filter(Number.isInteger))];

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

  await db.transaction(async (tx) => {
    let materialId = id;
    if (id) {
      await tx.update(schema.materiais).set(valores).where(eq(schema.materiais.id, id));
    } else {
      const [novo] = await tx.insert(schema.materiais).values(valores).returning({ id: schema.materiais.id });
      materialId = novo.id;
    }
    await tx.delete(schema.materiaisAlunos).where(eq(schema.materiaisAlunos.materialId, materialId!));
    if (!paraTodos) {
      await tx.insert(schema.materiaisAlunos).values(alunoIds.map((alunoId) => ({ materialId: materialId!, alunoId })));
    }
  });

  revalidatePath("/", "layout");
  redirect("/materiais");
}

export async function excluirMaterial(id: number) {
  await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.materiais).where(eq(schema.materiais.id, id));
  revalidatePath("/", "layout");
}
