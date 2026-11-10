import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { contaLiberada } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { COOKIE_SESSAO, criarToken, opcoesCookie } from "@/lib/sessao";

/**
 * Link pessoal do aluno (/a/<chave>): entra direto na área dele, sem digitar usuário nem código.
 * A chave é aleatória e só existe neste link; sem usuário (acesso tirado) ou aluno inativo, não entra.
 */
export async function GET(_: Request, ctx: RouteContext<"/a/[chave]">) {
  const { chave } = await ctx.params;
  const valida = /^[a-z0-9]{8,32}$/.test(chave);
  const db = await getDb();
  const aluno = valida ? await db.query.alunos.findFirst({ where: and(eq(schema.alunos.chave, chave), eq(schema.alunos.ativo, true)) }) : undefined;
  const professor = aluno?.usuario ? await db.query.professores.findFirst({ where: eq(schema.professores.id, aluno.professorId) }) : undefined;
  if (!aluno?.usuario || !professor || !contaLiberada(professor)) redirect("/login?acesso=aluno&link=invalido");
  (await cookies()).set(COOKIE_SESSAO, await criarToken({ tipo: "aluno", id: aluno.id }), opcoesCookie("aluno"));
  redirect("/portal");
}
