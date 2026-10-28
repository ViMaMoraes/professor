"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirMaster } from "@/lib/auth";
import { buscarProfessor, emailEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido } from "@/lib/formato";
import { gerarSenha } from "@/lib/senha";

export type EstadoNovoProfessor = { erro?: string; ok?: string; senha?: string; id?: number; email?: string; nome?: string } | null;

function lerDados(dados: FormData) {
  return {
    nome: texto(dados, "nome"),
    email: texto(dados, "email")?.toLowerCase() ?? null,
    acessoAte: texto(dados, "acessoAte"),
  };
}

/**
 * Cria a conta de um professor cliente (só o master) com uma senha provisória aleatória.
 * A senha aparece uma única vez na tela, para o master passar ao professor; no primeiro login ele cria a dele.
 */
export async function criarProfessor(_: EstadoNovoProfessor, dados: FormData): Promise<EstadoNovoProfessor> {
  await exigirMaster();
  const { nome, email, acessoAte } = lerDados(dados);
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (acessoAte && !isoValido(acessoAte)) return { erro: "Data de validade inválida." };
  if (await emailEmUso(email)) return { erro: "Esse e-mail já está em uso no site." };

  const senha = gerarSenha();
  const db = await getDb();
  const [novo] = await db
    .insert(schema.professores)
    .values({ nome, email, acessoAte, senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true, ativo: dados.get("ativo") === "on" })
    .returning({ id: schema.professores.id });
  revalidatePath("/admin");
  return { ok: "Conta criada.", senha, id: novo.id, email, nome };
}

/** Atualiza nome, e-mail, validade e situação de um professor (só o master). */
export async function salvarProfessor(id: number, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const master = await exigirMaster();
  const existente = await buscarProfessor(id);
  if (!existente) return { erro: "Professor não encontrado." };
  const { nome, email, acessoAte } = lerDados(dados);
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (acessoAte && !isoValido(acessoAte)) return { erro: "Data de validade inválida." };
  if (await emailEmUso(email, { professorId: id })) return { erro: "Esse e-mail já está em uso no site." };

  const db = await getDb();
  await db
    .update(schema.professores)
    .set({
      nome,
      email,
      acessoAte: existente.master ? null : acessoAte,
      // o master não pode se bloquear
      ativo: existente.id === master.id ? true : dados.get("ativo") === "on",
    })
    .where(eq(schema.professores.id, id));
  revalidatePath("/", "layout");
  redirect("/admin");
}

/** Gera uma nova senha provisória para um professor que esqueceu a dele (só o master, nunca a própria). */
export async function gerarNovaSenha(id: number): Promise<{ erro?: string; senha?: string }> {
  const master = await exigirMaster();
  if (id === master.id) return { erro: "Para trocar a sua senha, use Configurações." };
  if (!(await buscarProfessor(id))) return { erro: "Professor não encontrado." };
  const senha = gerarSenha();
  const db = await getDb();
  await db
    .update(schema.professores)
    .set({ senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true })
    .where(eq(schema.professores.id, id));
  return { senha };
}

/** Bloqueia ou libera a conta de um professor. */
export async function alternarProfessor(id: number) {
  const master = await exigirMaster();
  if (id === master.id) return;
  const professor = await buscarProfessor(id);
  if (!professor || professor.master) return;
  const db = await getDb();
  await db.update(schema.professores).set({ ativo: !professor.ativo }).where(eq(schema.professores.id, id));
  revalidatePath("/", "layout");
}

/** Exclui o professor e TODOS os dados dele (alunos, chamadas, recibos, materiais). */
export async function excluirProfessor(id: number) {
  const master = await exigirMaster();
  const professor = await buscarProfessor(id);
  if (!professor || professor.master || id === master.id) return;
  const db = await getDb();
  await db.delete(schema.professores).where(eq(schema.professores.id, id));
  revalidatePath("/", "layout");
  redirect("/admin");
}
