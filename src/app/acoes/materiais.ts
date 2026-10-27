"use server";

import fs from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { caminhoUpload, PASTA_UPLOADS } from "@/lib/caminhos";
import { EXTENSOES_PERMITIDAS, TAMANHO_MAXIMO_UPLOAD } from "@/lib/constantes";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";

function extensao(nome: string) {
  return nome.includes(".") ? nome.split(".").pop()!.toLowerCase() : "";
}

export async function salvarMaterial(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirProfessor();
  const db = await getDb();

  const titulo = texto(dados, "titulo");
  const paraTodos = dados.get("destino") === "todos";
  const alunoIds = [...new Set(dados.getAll("alunos").map(Number).filter(Number.isInteger))];
  const arquivo = dados.get("arquivo");

  if (!titulo) return { erro: "Informe um título para o material." };
  if (!paraTodos && alunoIds.length === 0) return { erro: "Escolha pelo menos um aluno ou marque “Todos os alunos”." };

  const valores = { titulo, descricao: texto(dados, "descricao"), categoria: texto(dados, "categoria"), paraTodos };
  let materialId = id;

  if (id) {
    await db.update(schema.materiais).set(valores).where(eq(schema.materiais.id, id));
  } else {
    if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha um arquivo para enviar." };
    const ext = extensao(arquivo.name);
    if (!EXTENSOES_PERMITIDAS.has(ext)) return { erro: `Tipo de arquivo não permitido (.${ext || "sem extensão"}).` };
    if (arquivo.size > TAMANHO_MAXIMO_UPLOAD) return { erro: "Arquivo maior que 100 MB." };

    const nomeSalvo = `${crypto.randomUUID()}.${ext}`;
    await fs.mkdir(PASTA_UPLOADS, { recursive: true });
    await fs.writeFile(caminhoUpload(nomeSalvo), Buffer.from(await arquivo.arrayBuffer()));
    const [novo] = await db
      .insert(schema.materiais)
      .values({
        ...valores,
        arquivo: nomeSalvo,
        nomeOriginal: path.basename(arquivo.name).replace(/[^\p{L}\p{N}._ -]/gu, "_"),
        tipo: arquivo.type || null,
        tamanho: arquivo.size,
      })
      .returning({ id: schema.materiais.id });
    materialId = novo.id;
  }

  await db.delete(schema.materiaisAlunos).where(eq(schema.materiaisAlunos.materialId, materialId!));
  if (!paraTodos) {
    await db.insert(schema.materiaisAlunos).values(alunoIds.map((alunoId) => ({ materialId: materialId!, alunoId })));
  }

  revalidatePath("/", "layout");
  redirect("/materiais");
}

export async function excluirMaterial(id: number) {
  await exigirProfessor();
  const db = await getDb();
  const [apagado] = await db.delete(schema.materiais).where(eq(schema.materiais.id, id)).returning();
  if (apagado) await fs.rm(caminhoUpload(apagado.arquivo), { force: true });
  revalidatePath("/", "layout");
}
