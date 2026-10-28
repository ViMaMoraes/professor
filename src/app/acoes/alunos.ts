"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao, usuarioEmUso } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";
import { notificarAlunos } from "@/lib/push";
import { normalizarUsuario } from "@/lib/usuario";

export async function salvarAluno(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  const anterior = id ? await buscarAluno(professor.id, id) : undefined;
  if (id && !anterior) return { erro: "Aluno não encontrado." };

  const nome = texto(dados, "nome");
  const email = texto(dados, "email")?.toLowerCase() ?? null;
  const usuario = normalizarUsuario(String(dados.get("usuario") ?? "")) || null;
  const valorDigitado = texto(dados, "mensalidade");
  const mensalidade = lerValorEmCentavos(valorDigitado);

  if (!nome) return { erro: "Informe o nome do aluno." };
  if (valorDigitado && mensalidade == null) return { erro: "Valor da mensalidade inválido." };
  // o usuário é o login do aluno, então precisa ser único no site inteiro
  if (usuario && usuario.length < 3) return { erro: "O usuário precisa ter pelo menos 3 caracteres." };
  if (usuario && (await usuarioEmUso(usuario, id ?? undefined))) {
    return { erro: `O usuário “${usuario}” já está em uso. Tente outro, por exemplo “${usuario}${Math.floor(Math.random() * 90 + 10)}”.` };
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
    descricaoRecibo: texto(dados, "descricaoRecibo"),
    mensagem: texto(dados, "mensagem")?.slice(0, 1000) ?? null,
    instituicaoId,
    usuario,
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
  // mensagem nova ou alterada: avisa no celular do aluno (se ele ativou as notificações)
  if (valores.mensagem && valores.mensagem !== anterior?.mensagem) {
    await notificarAlunos([alunoId!], { title: `Mensagem de ${professor.nome.split(" ")[0]}`, body: valores.mensagem.slice(0, 180), url: "/portal" });
  }
  revalidatePath("/", "layout");
  // aluno novo: o formulário pergunta se quer cadastrar outro; editando, volta para a página dele
  if (!id) return { ok: `Aluno “${nome}” cadastrado!`, criado: true };
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
