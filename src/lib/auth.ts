import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { garantirCodigo } from "./consultas";
import { getDb, schema } from "./db";
import type { Membro, Professor } from "./db/schema";
import { hojeISO } from "./formato";
import { ACESSO_DONO, acessoDoMembro, filtroDeAlunos, podeVer, type Acesso, type Modulo } from "./permissoes";
import { COOKIE_SESSAO, lerToken } from "./sessao";

/** A conta do professor está liberada? (o master nunca é bloqueado) */
export function contaLiberada(professor: Pick<Professor, "master" | "ativo" | "acessoAte">, hoje = hojeISO()) {
  if (professor.master) return true;
  if (!professor.ativo) return false;
  return !professor.acessoAte || professor.acessoAte >= hoje;
}

/**
 * Lê a sessão e confirma no banco que o usuário ainda existe e está liberado:
 * professor com conta ativa e no prazo; alguém da equipe ativo, numa conta liberada (entra como
 * "professor", nos dados do dono, com `membro` preenchido); aluno ativo e com o professor liberado.
 */
export const usuarioAtual = cache(async () => {
  const sessao = await lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;
  const db = await getDb();

  if (sessao.tipo === "professor") {
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, sessao.id) });
    return professor && contaLiberada(professor) ? { tipo: "professor" as const, professor, membro: null } : null;
  }
  if (sessao.tipo === "membro") {
    const membro = await db.query.membros.findFirst({ where: eq(schema.membros.id, sessao.id) });
    if (!membro?.ativo) return null;
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, membro.professorId) });
    // a equipe só existe enquanto a conta é de estúdio
    return professor && contaLiberada(professor) && professor.tipoConta === "estudio" ? { tipo: "professor" as const, professor, membro } : null;
  }
  const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.id, sessao.id) });
  // sem usuário = acesso removido pelo professor
  if (!aluno?.ativo || !aluno.usuario) return null;
  const professor = await db.query.professores.findFirst({ where: eq(schema.professores.id, aluno.professorId) });
  return professor && contaLiberada(professor) ? { tipo: "aluno" as const, aluno, professor } : null;
});

/** Quem está usando a conta (dono ou alguém da equipe) e o que pode ver. */
export function acessoDe(usuario: { professor: { nome: string }; membro: Membro | null }): Acesso {
  return usuario.membro ? acessoDoMembro(usuario.membro) : ACESSO_DONO(usuario.professor.nome);
}

/** Para as rotas de arquivo: o professor (dono ou equipe) logado pode ver este módulo? */
export function professorPodeVer(usuario: Awaited<ReturnType<typeof usuarioAtual>>, modulo: Modulo) {
  return usuario?.tipo === "professor" && podeVer(acessoDe(usuario), modulo);
}

/**
 * Professor (dono ou equipe) logado, com o que ele pode ver. Os dados são sempre os da conta do dono
 * (`professor`). Com `modulo`, quem da equipe não tem esse módulo volta para o painel.
 */
export async function exigirAcesso(modulo?: Modulo) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.tipo !== "professor") redirect("/portal");
  // entrou com senha provisória: precisa criar a própria antes de usar o site
  if ((usuario.membro ?? usuario.professor).trocarSenha) redirect("/trocar-senha");
  const acesso = acessoDe(usuario);
  if (modulo && !podeVer(acesso, modulo)) redirect("/painel");
  // conta de antes do código do professor existir: gera um na primeira vez.
  // `escopoMembro`: as consultas de alunos, agenda e chamada mostram só os alunos dele (ver Conta em consultas)
  const professor = { ...(await garantirCodigo(usuario.professor)), escopoMembro: filtroDeAlunos(acesso) };
  return { professor, membro: usuario.membro, acesso };
}

/** A conta em que se está trabalhando (a do dono). Com `modulo`, exige que a pessoa possa ver esse módulo. */
export async function exigirProfessor(modulo?: Modulo) {
  return (await exigirAcesso(modulo)).professor;
}

/** Só o dono da conta (Configurações, Equipe): quem é da equipe volta para o painel. */
export async function exigirDono() {
  const { professor, membro } = await exigirAcesso();
  if (membro) redirect("/painel");
  return professor;
}

/** Só o master (administrador da plataforma), nunca alguém da equipe dele. */
export async function exigirMaster() {
  const professor = await exigirDono();
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
