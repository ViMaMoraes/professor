"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { mesValido } from "@/lib/financeiro";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

/** "Marcar como pago" no Financeiro: registra o pagamento do mês sem emitir recibo. */
export async function marcarPagamento(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor();
  const tipo = dados.get("tipo");
  const pagadorId = Number(dados.get("pagadorId"));
  const referencia = dados.get("referencia");
  const valor = lerValorEmCentavos(dados.get("valor"));
  const data = texto(dados, "dataPagamento");

  const dono = tipo === "instituicao" ? await buscarInstituicao(professor.id, pagadorId) : await buscarAluno(professor.id, pagadorId);
  if (!dono) return { erro: "Aluno ou instituição não encontrado." };
  if (!mesValido(referencia)) return { erro: "Mês de referência inválido." };
  if (!valor) return { erro: "Informe o valor pago." };
  if (!isoValido(data)) return { erro: "Informe a data do pagamento." };

  const db = await getDb();
  await db.insert(schema.pagamentos).values({
    professorId: professor.id,
    alunoId: tipo === "aluno" ? pagadorId : null,
    instituicaoId: tipo === "instituicao" ? pagadorId : null,
    referencia,
    valorCentavos: valor,
    dataPagamento: data,
    formaPagamento: texto(dados, "formaPagamento"),
    observacao: texto(dados, "observacao"),
  });
  revalidatePath("/", "layout");
  return { ok: "Pagamento registrado." };
}

/** Desfaz um pagamento marcado à mão (ex.: marcou o aluno errado). */
export async function excluirPagamento(id: number) {
  const professor = await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.pagamentos).where(and(eq(schema.pagamentos.id, id), eq(schema.pagamentos.professorId, professor.id)));
  revalidatePath("/", "layout");
}
