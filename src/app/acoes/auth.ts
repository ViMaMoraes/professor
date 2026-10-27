"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import { contaLiberada } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { explicarErroDeConfiguracao } from "@/lib/erros";
import { normalizarUsuario } from "@/lib/usuario";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { COOKIE_SESSAO, criarToken, opcoesCookie, type Sessao } from "@/lib/sessao";

async function iniciarSessao(sessao: Sessao) {
  (await cookies()).set(COOKIE_SESSAO, await criarToken(sessao), opcoesCookie);
}

export async function entrar(estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  try {
    return await fazerLogin(estado, dados);
  } catch (erro) {
    unstable_rethrow(erro); // deixa o redirect do login funcionar
    return explicarErroDeConfiguracao(erro);
  }
}

async function fazerLogin(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = texto(dados, "email")?.toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const db = await getDb();
  const professor = await db.query.professores.findFirst({ where: eq(schema.professores.email, email) });
  if (professor && (await bcrypt.compare(senha, professor.senhaHash))) {
    if (!contaLiberada(professor)) {
      return { erro: "Sua conta está suspensa ou o acesso expirou. Fale com o administrador do site para reativar." };
    }
    await iniciarSessao({ tipo: "professor", id: professor.id });
    redirect("/painel");
  }
  return { erro: "E-mail ou senha inválidos." };
}

/** Acesso aluno: só o usuário, sem senha (leva direto para os downloads). */
export async function entrarAluno(estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  try {
    const usuario = normalizarUsuario(String(dados.get("usuario") ?? ""));
    if (!usuario) return { erro: "Digite seu usuário." };
    const db = await getDb();
    const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.usuario, usuario) });
    if (!aluno?.ativo) return { erro: "Usuário não encontrado. Confira com seu professor." };
    const dono = await db.query.professores.findFirst({ where: eq(schema.professores.id, aluno.professorId) });
    if (!dono || !contaLiberada(dono)) return { erro: "O acesso está indisponível no momento. Fale com seu professor." };
    await iniciarSessao({ tipo: "aluno", id: aluno.id });
    redirect("/portal");
  } catch (erro) {
    unstable_rethrow(erro);
    return explicarErroDeConfiguracao(erro);
  }
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

/**
 * Primeiro acesso: cria a conta do professor master (o administrador da plataforma).
 * Só funciona enquanto não existe nenhuma conta; depois, novos professores são criados pelo master.
 */
export async function criarConta(estado: EstadoForm, dados: FormData): Promise<EstadoForm> {
  try {
    return await fazerCriarConta(estado, dados);
  } catch (erro) {
    unstable_rethrow(erro);
    return explicarErroDeConfiguracao(erro);
  }
}

async function fazerCriarConta(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
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
    .values({ nome, email, senhaHash: await bcrypt.hash(senha, 10), master: true })
    .returning();
  await iniciarSessao({ tipo: "professor", id: professor.id });
  redirect("/painel");
}
