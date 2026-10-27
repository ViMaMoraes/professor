"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao, emailEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  if (id && !(await buscarAluno(professor.id, id))) return { erro: "Aluno não encontrado." };

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase() ?? null;
  const senha = String(dados.get("senha") ?? "");
  const valorDigitado = texto(dados, "mensalidade");
  const mensalidade = lerValorEmCentavos(valorDigitado);

  if (!nome) return { erro: "Informe o nome do aluno." };
  if (valorDigitado && mensalidade == null) return { erro: "Valor da mensalidade inválido." };
  if (senha && senha.length < 6) return { erro: "A senha do portal precisa ter pelo menos 6 caracteres." };
  if (senha && !email) return { erro: "Para liberar o portal, informe o e-mail do aluno." };
  // o e-mail é o login, então precisa ser único no site inteiro (entre todos os professores e alunos)
  if (email && (await emailEmUso(email, { alunoId: id ?? undefined }))) {
    return { erro: "Esse e-mail já está em uso por outra pessoa no site. Use outro." };
  }

  const instituicaoId = Number(dados.get("instituicaoId")) || null;
  if (instituicaoId && !(await buscarInstituicao(professor.id, instituicaoId))) return { erro: "Instituição inválida." };

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
    instituicaoId,
    ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}),
    ...(dados.get("removerAcesso") ? { senhaHash: null } : {}),
  };

  let alunoId = id;
  if (id) {
    await db
      .update(schema.alunos)
      .set(valores)
      .where(and(eq(schema.alunos.id, id), eq(schema.alunos.professorId, professor.id)));
  } else {
    const [novo] = await db
      .insert(schema.alunos)
      .values({ ...valores, professorId: professor.id })
      .returning({ id: schema.alunos.id });
    alunoId = novo.id;
  }
  revalidatePath("/", "layout");
  redirect(`/alunos/${alunoId}`);
}

export async function alternarSituacao(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  const aluno = await buscarAluno(professor.id, id);
  if (aluno) await db.update(schema.alunos).set({ ativo: !aluno.ativo }).where(eq(schema.alunos.id, id));
  revalidatePath("/", "layout");
}

export async function excluirAluno(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.alunos).where(and(eq(schema.alunos.id, id), eq(schema.alunos.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/alunos");
}
