"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

export async function criarRecibo(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const db = await getDb();

  const paraInstituicao = dados.get("tipo") === "instituicao";
  const alunoId = paraInstituicao ? 0 : Number(dados.get("alunoId"));
  const instituicaoId = paraInstituicao ? Number(dados.get("instituicaoId")) : 0;
  const valor = lerValorEmCentavos(dados.get("valor"));
  const dataPagamento = texto(dados, "dataPagamento");
  const referente = texto(dados, "referente");

  // o recibo é de um aluno OU de uma instituição, sempre deste professor
  if (paraInstituicao) {
    if (!instituicaoId || !(await buscarInstituicao(professor.id, instituicaoId))) return { erro: "Escolha a instituição." };
  } else if (!alunoId || !(await buscarAluno(professor.id, alunoId))) {
    return { erro: "Escolha o aluno." };
  }
  if (!valor) return { erro: "Informe um valor válido." };
  if (!isoValido(dataPagamento)) return { erro: "Informe a data do pagamento." };
  if (!referente) return { erro: "Informe a que se refere o pagamento." };

  // o próximo número (sequência própria de cada professor) é calculado dentro do próprio INSERT,
  // então dois recibos simultâneos não repetem número
  const [recibo] = await db
    .insert(schema.recibos)
    .values({
      professorId: professor.id,
      numero: sql`(select coalesce(max(${schema.recibos.numero}), 0) + 1 from ${schema.recibos} where ${schema.recibos.professorId} = ${professor.id})`,
      alunoId: alunoId || null,
      instituicaoId: instituicaoId || null,
      valorCentavos: valor,
      referente,
      dataPagamento,
      formaPagamento: texto(dados, "formaPagamento"),
      observacoes: texto(dados, "observacoes"),
    })
    .returning();

  revalidatePath("/", "layout");
  redirect(`/recibos/${recibo.id}`);
}

export async function excluirRecibo(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.recibos).where(and(eq(schema.recibos.id, id), eq(schema.recibos.professorId, professor.id)));
  revalidatePath("/", "layout");
  redirect("/recibos");
}
