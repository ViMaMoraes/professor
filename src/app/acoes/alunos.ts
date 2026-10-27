"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirProfessor();
  const db = await getDb();

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase() ?? null;
  const senha = String(dados.get("senha") ?? "");
  const valorDigitado = texto(dados, "mensalidade");
  const mensalidade = lerValorEmCentavos(valorDigitado);

  if (!nome) return { erro: "Informe o nome do aluno." };
  if (valorDigitado && mensalidade == null) return { erro: "Valor da mensalidade inválido." };
  if (senha && senha.length < 6) return { erro: "A senha do portal precisa ter pelo menos 6 caracteres." };
  if (senha && !email) return { erro: "Para liberar o portal, informe o e-mail do aluno." };
  if (email) {
    const outro = await db.query.alunos.findFirst({
      where: and(eq(schema.alunos.email, email), id ? ne(schema.alunos.id, id) : undefined),
    });
    if (outro) return { erro: "Já existe outro aluno com esse e-mail." };
    const professor = await db.query.professores.findFirst({ where: eq(schema.professores.email, email) });
    if (professor) return { erro: "Esse é o e-mail do professor; use outro para o aluno." };
  }

  const data = (campo: string) => {
    const valor = texto(dados, campo);
    return isoValido(valor) ? valor : null;
  };
  const valores = {
    nome,
    email,
    telefone: texto(dados, "telefone"),
    responsavel: texto(dados, "responsavel"),
    dataNascimento: data("dataNascimento"),
    instrumento: texto(dados, "instrumento"),
    nivel: texto(dados, "nivel"),
    diaAula: texto(dados, "diaAula"),
    horario: texto(dados, "horario"),
    mensalidadeCentavos: mensalidade,
    dataInicio: data("dataInicio"),
    observacoes: texto(dados, "observacoes"),
    ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}),
    ...(dados.get("removerAcesso") ? { senhaHash: null } : {}),
  };

  let alunoId = id;
  if (id) {
    await db.update(schema.alunos).set(valores).where(eq(schema.alunos.id, id));
  } else {
    const [novo] = await db.insert(schema.alunos).values(valores).returning({ id: schema.alunos.id });
    alunoId = novo.id;
  }
  revalidatePath("/", "layout");
  redirect(`/alunos/${alunoId}`);
}

export async function alternarSituacao(id: number) {
  await exigirProfessor();
  const db = await getDb();
  const aluno = await db.query.alunos.findFirst({ where: eq(schema.alunos.id, id) });
  if (aluno) await db.update(schema.alunos).set({ ativo: !aluno.ativo }).where(eq(schema.alunos.id, id));
  revalidatePath("/", "layout");
}

export async function excluirAluno(id: number) {
  await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.alunos).where(eq(schema.alunos.id, id));
  revalidatePath("/", "layout");
  redirect("/alunos");
}
