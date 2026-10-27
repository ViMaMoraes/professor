"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { exigirAluno, exigirProfessor } from "@/lib/auth";
import { emailEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";

export async function salvarConfiguracoes(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase();
  const novaSenha = String(dados.get("novaSenha") ?? "");
  if (!nome || !email) return { erro: "Nome e e-mail são obrigatórios." };

  if (await emailEmUso(email, { professorId: professor.id })) return { erro: "Esse e-mail já está em uso." };

  if (novaSenha) {
    if (novaSenha.length < 6) return { erro: "A nova senha precisa ter pelo menos 6 caracteres." };
    if (!(await bcrypt.compare(String(dados.get("senhaAtual") ?? ""), professor.senhaHash))) {
      return { erro: "Para trocar a senha, informe a senha atual corretamente." };
    }
  }

  await db
    .update(schema.professores)
    .set({
      nome,
      email,
      documento: texto(dados, "documento"),
      telefone: texto(dados, "telefone"),
      endereco: texto(dados, "endereco"),
      cidade: texto(dados, "cidade"),
      chavePix: texto(dados, "chavePix"),
      ...(novaSenha ? { senhaHash: await bcrypt.hash(novaSenha, 10) } : {}),
    })
    .where(eq(schema.professores.id, professor.id));
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}

export async function trocarSenhaAluno(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const aluno = await exigirAluno();
  const nova = String(dados.get("nova") ?? "");
  if (!aluno.senhaHash || !(await bcrypt.compare(String(dados.get("atual") ?? ""), aluno.senhaHash))) {
    return { erro: "Senha atual incorreta." };
  }
  if (nova.length < 6) return { erro: "A nova senha precisa ter pelo menos 6 caracteres." };
  if (nova !== dados.get("confirmar")) return { erro: "As senhas não conferem." };

  const db = await getDb();
  await db.update(schema.alunos).set({ senhaHash: await bcrypt.hash(nova, 10) }).where(eq(schema.alunos.id, aluno.id));
  return { ok: "Senha alterada." };
}
