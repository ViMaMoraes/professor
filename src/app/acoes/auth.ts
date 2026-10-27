"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { COOKIE_SESSAO, criarToken, opcoesCookie, type Sessao } from "@/lib/sessao";

async function iniciarSessao(sessao: Sessao) {
  (await cookies()).set(COOKIE_SESSAO, await criarToken(sessao), opcoesCookie);
}

export async function entrar(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = texto(dados, "email")?.toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const db = await getDb();
  const professor = await db.query.professores.findFirst({ where: eq(schema.professores.email, email) });
  if (professor && (await bcrypt.compare(senha, professor.senhaHash))) {
    await iniciarSessao({ tipo: "professor", id: professor.id });
    redirect("/painel");
  }
  const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.email, email) });
  if (aluno?.ativo && aluno.senhaHash && (await bcrypt.compare(senha, aluno.senhaHash))) {
    await iniciarSessao({ tipo: "aluno", id: aluno.id });
    redirect("/portal");
  }
  return { erro: "E-mail ou senha inválidos." };
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}

export async function existeProfessor() {
  const db = await getDb();
  const [{ total }] = await db.select({ total: count() }).from(schema.professores);
  return total > 0;
}

/** Primeiro acesso: cria a conta do professor (só funciona enquanto não existe nenhuma). */
export async function criarConta(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  if (await existeProfessor()) redirect("/login");

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  if (!nome || !email) return { erro: "Preencha nome e e-mail." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  if (senha !== dados.get("confirmar")) return { erro: "As senhas não conferem." };

  const db = await getDb();
  const [professor] = await db
    .insert(schema.professores)
    .values({ nome, email, senhaHash: await bcrypt.hash(senha, 10) })
    .returning();
  await iniciarSessao({ tipo: "professor", id: professor.id });
  redirect("/painel");
}
