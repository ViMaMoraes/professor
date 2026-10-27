import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb, schema } from "./db";
import { COOKIE_SESSAO, lerToken } from "./sessao";

/** Lê a sessão e confirma no banco que o usuário ainda existe (aluno precisa estar ativo). */
export const usuarioAtual = cache(async () => {
  const sessao = await lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;
  const db = await getDb();

  if (sessao.tipo === "professor") {
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, sessao.id) });
    return professor ? { tipo: "professor" as const, professor } : null;
  }
  const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.id, sessao.id) });
  return aluno?.ativo ? { tipo: "aluno" as const, aluno } : null;
});

export async function exigirProfessor() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "professor") redirect("/portal");
  return usuario.professor;
}

export async function exigirAluno() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "aluno") redirect("/painel");
  return usuario.aluno;
}
