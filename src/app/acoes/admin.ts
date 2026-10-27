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

/** Cria ou atualiza a conta de um professor cliente (só o master). */
export async function salvarProfessor(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const master = await exigirMaster();
  const db = await getDb();
  const existente = id ? await buscarProfessor(id) : undefined;
  if (id && !existente) return { erro: "Professor não encontrado." };

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  const acessoAte = texto(dados, "acessoAte");

  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (!existente && senha.length < 6) return { erro: "Defina uma senha inicial com pelo menos 6 caracteres." };
  if (senha && senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  if (acessoAte && !isoValido(acessoAte)) return { erro: "Data de validade inválida." };
  if (await emailEmUso(email, { professorId: id ?? undefined })) return { erro: "Esse e-mail já está em uso no site." };

  const valores = {
    nome,
    email,
    acessoAte: acessoAte || null,
    // o master não pode se bloquear
    ativo: existente?.id === master.id ? true : dados.get("ativo") === "on",
    ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}),
  };

  if (existente) {
    await db.update(schema.professores).set(valores).where(eq(schema.professores.id, existente.id));
  } else {
    await db.insert(schema.professores).values({ ...valores, senhaHash: valores.senhaHash! });
  }
  revalidatePath("/", "layout");
  redirect("/admin");
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
