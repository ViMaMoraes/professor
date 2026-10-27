"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarInstituicao, listarAlunos } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { lerValorEmCentavos } from "@/lib/formato";

const { instituicoes, alunos } = schema;

export async function salvarInstituicao(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();
  if (id && !(await buscarInstituicao(professor.id, id))) return { erro: "Instituição não encontrada." };

  const nome = texto(dados, "nome");
  const valorDigitado = texto(dados, "valorMensal");
  const valorMensal = lerValorEmCentavos(valorDigitado);
  if (!nome) return { erro: "Informe o nome da instituição." };
  if (valorDigitado && valorMensal == null) return { erro: "Valor mensal inválido." };

  const valores = {
    nome,
    documento: texto(dados, "documento"),
    contato: texto(dados, "contato"),
    email: texto(dados, "email")?.toLowerCase() ?? null,
    telefone: texto(dados, "telefone"),
    endereco: texto(dados, "endereco"),
    valorMensalCentavos: valorMensal,
    observacoes: texto(dados, "observacoes"),
  };

  let instituicaoId = id;
  if (id) {
    await db
      .update(instituicoes)
      .set(valores)
      .where(and(eq(instituicoes.id, id), eq(instituicoes.professorId, professor.id)));
  } else {
    const [nova] = await db
      .insert(instituicoes)
      .values({ ...valores, professorId: professor.id })
      .returning({ id: instituicoes.id });
    instituicaoId = nova.id;
  }

  // alunos marcados no formulário passam a ser desta instituição (só alunos deste professor)
  if (dados.get("atualizarAlunos")) {
    const meus = await listarAlunos(professor.id, { situacao: "todos" });
    const marcados = new Set(dados.getAll("alunos").map(Number));
    const comandos = meus
      .filter((a) => marcados.has(a.id) !== (a.instituicaoId === instituicaoId))
      .map((a) =>
        db
          .update(alunos)
          .set({ instituicaoId: marcados.has(a.id) ? instituicaoId : null })
          .where(eq(alunos.id, a.id)),
      );
    if (comandos.length) await db.batch(comandos as [(typeof comandos)[number], ...typeof comandos]);
  }

  revalidatePath("/", "layout");
  redirect(`/instituicoes/${instituicaoId}`);
}

export async function alternarInstituicao(id: number) {
  const professor = await exigirProfessor();
  const instituicao = await buscarInstituicao(professor.id, id);
  if (!instituicao) return;
  const db = await getDb();
  await db.update(instituicoes).set({ ativo: !instituicao.ativo }).where(eq(instituicoes.id, id));
  revalidatePath("/", "layout");
}

/** Exclui a instituição e os recibos dela. Os alunos continuam cadastrados (só perdem o vínculo). */
export async function excluirInstituicao(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(instituicoes).where(and(eq(instituicoes.id, id), eq(instituicoes.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/instituicoes");
}
