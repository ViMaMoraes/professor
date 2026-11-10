"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirDono } from "@/lib/auth";
import { buscarMembro, emailEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { cargoValido, gravarModulos, moduloValido } from "@/lib/permissoes";
import { gerarSenha } from "@/lib/senha";

export type EstadoNovoMembro = { erro?: string; ok?: string; senha?: string; id?: number; email?: string; nome?: string } | null;

/** Só o dono de uma conta de estúdio cuida da equipe. */
async function exigirDonoDeEstudio() {
  const professor = await exigirDono();
  if (professor.tipoConta !== "estudio") redirect("/configuracoes");
  return professor;
}

function lerDados(dados: FormData) {
  const cargo = cargoValido(dados.get("cargo")) ? (dados.get("cargo") as "professor" | "coordenacao") : "professor";
  return {
    nome: texto(dados, "nome"),
    email: texto(dados, "email")?.toLowerCase() ?? null,
    cargo,
    modulos: gravarModulos(dados.getAll("modulos").filter(moduloValido)),
    todosAlunos: dados.get("todosAlunos") === "on",
  };
}

/** Adiciona alguém à equipe com uma senha provisória (aparece uma vez, para o dono passar adiante). */
export async function criarMembro(_: EstadoNovoMembro, dados: FormData): Promise<EstadoNovoMembro> {
  const professor = await exigirDonoDeEstudio();
  const { nome, email, ...resto } = lerDados(dados);
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (await emailEmUso(email)) return { erro: "Esse e-mail já está em uso no site. Use outro e-mail para esta pessoa." };
  const senha = gerarSenha();
  const db = await getDb();
  const [novo] = await db
    .insert(schema.membros)
    .values({ professorId: professor.id, nome, email, ...resto, senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true })
    .returning({ id: schema.membros.id });
  revalidatePath("/equipe");
  return { ok: `${nome} entrou para a equipe.`, senha, id: novo.id, email, nome };
}

export async function salvarMembro(id: number, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirDonoDeEstudio();
  if (!(await buscarMembro(professor.id, id))) return { erro: "Pessoa não encontrada na equipe." };
  const { nome, email, ...resto } = lerDados(dados);
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (await emailEmUso(email, { membroId: id })) return { erro: "Esse e-mail já está em uso no site." };
  const db = await getDb();
  await db
    .update(schema.membros)
    .set({ nome, email, ...resto, ativo: dados.get("ativo") === "on" })
    .where(and(eq(schema.membros.id, id), eq(schema.membros.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/equipe");
}

/** Bloqueia ou libera o acesso (nada é apagado). */
export async function alternarMembro(id: number) {
  const professor = await exigirDonoDeEstudio();
  const membro = await buscarMembro(professor.id, id);
  if (!membro) return;
  const db = await getDb();
  await db.update(schema.membros).set({ ativo: !membro.ativo }).where(eq(schema.membros.id, id));
  revalidatePath("/equipe");
}

export async function novaSenhaMembro(id: number): Promise<{ erro?: string; senha?: string }> {
  const professor = await exigirDonoDeEstudio();
  if (!(await buscarMembro(professor.id, id))) return { erro: "Pessoa não encontrada na equipe." };
  const senha = gerarSenha();
  const db = await getDb();
  await db.update(schema.membros).set({ senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true }).where(eq(schema.membros.id, id));
  return { senha };
}

/** Tira da equipe: os alunos, chamadas e recibos continuam na conta; só some o login e a ligação com os alunos. */
export async function excluirMembro(id: number) {
  const professor = await exigirDonoDeEstudio();
  const db = await getDb();
  await db.delete(schema.membros).where(and(eq(schema.membros.id, id), eq(schema.membros.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/equipe");
}
