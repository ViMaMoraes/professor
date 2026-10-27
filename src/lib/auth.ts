import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb, schema } from "./db";
import type { Professor } from "./db/schema";
import { hojeISO } from "./formato";
import { COOKIE_SESSAO, lerToken } from "./sessao";

/** A conta do professor está liberada? (o master nunca é bloqueado) */
export function contaLiberada(professor: Pick<Professor, "master" | "ativo" | "acessoAte">, hoje = hojeISO()) {
  if (professor.master) return true;
  if (!professor.ativo) return false;
  return !professor.acessoAte || professor.acessoAte >= hoje;
}

/**
 * Lê a sessão e confirma no banco que o usuário ainda existe e está liberado:
 * professor com conta ativa e no prazo; aluno ativo e com o professor liberado.
 */
export const usuarioAtual = cache(async () => {
  const sessao = await lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;
  const db = await getDb();

  if (sessao.tipo === "professor") {
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, sessao.id) });
    return professor && contaLiberada(professor) ? { tipo: "professor" as const, professor } : null;
  }
  const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.id, sessao.id) });
  // sem usuário = acesso removido pelo professor
  if (!aluno?.ativo || !aluno.usuario) return null;
  const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, aluno.professorId) });
  return professor && contaLiberada(professor) ? { tipo: "aluno" as const, aluno, professor } : null;
});

export async function exigirProfessor() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "professor") redirect("/portal");
  return usuario.professor;
}

/** Só o master (administrador da plataforma). */
export async function exigirMaster() {
  const professor = await exigirProfessor();
  if (!professor.master) redirect("/painel");
  return professor;
}

export async function exigirAluno() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "aluno") redirect("/painel");
  return usuario.aluno;
}

/** Aluno logado e o professor dele (para o portal). */
export async function exigirAlunoComProfessor() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "aluno") redirect("/painel");
  return usuario;
}
