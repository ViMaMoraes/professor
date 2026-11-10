"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, buscarInstituicao, buscarRecibo } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { mesValido } from "@/lib/financeiro";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

/** Cria (id = null) ou edita um recibo. Na edição o número continua o mesmo. */
export async function salvarRecibo(id: number | null, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("recibos");
  const db = await getDb();
  if (id && !(await buscarRecibo(id, { professorId: professor.id }))) return { erro: "Recibo não encontrado." };

  const paraInstituicao = dados.get("tipo") === "instituicao";
  const alunoId = paraInstituicao ? 0 : Number(dados.get("alunoId"));
  const instituicaoId = paraInstituicao ? Number(dados.get("instituicaoId")) : 0;
  const valor = lerValorEmCentavos(dados.get("valor"));
  const dataPagamento = texto(dados, "dataPagamento");
  const referente = texto(dados, "referente");

  // o recibo é de um aluno OU de uma instituição, sempre deste professor
  if (paraInstituicao) {
    if (!instituicaoId || !(await buscarInstituicao(professor.id, instituicaoId))) return { erro: "Escolha a instituição." };
  } else if (!alunoId || !(await buscarAluno(professor, alunoId))) {
    return { erro: "Escolha o aluno." };
  }
  if (!valor) return { erro: "Informe um valor válido." };
  if (!isoValido(dataPagamento)) return { erro: "Informe a data do pagamento." };
  if (!referente) return { erro: "Informe a que se refere o pagamento." };
  // mês que o pagamento quita (aparece no Financeiro); sem ele, vale o mês da data do pagamento
  const mes = dados.get("referencia");
  const referencia = mesValido(mes) ? mes : dataPagamento.slice(0, 7);

  const valores = {
    alunoId: alunoId || null,
    instituicaoId: instituicaoId || null,
    valorCentavos: valor,
    referente,
    dataPagamento,
    referencia,
    formaPagamento: texto(dados, "formaPagamento"),
    observacoes: texto(dados, "observacoes"),
  };

  let reciboId = id;
  if (reciboId) {
    await db
      .update(schema.recibos)
      .set(valores)
      .where(and(eq(schema.recibos.id, reciboId), eq(schema.recibos.professorId, professor.id)));
  } else {
    // o próximo número (sequência própria de cada professor) é calculado dentro do próprio INSERT,
    // então dois recibos simultâneos não repetem número
    const [novo] = await db
      .insert(schema.recibos)
      .values({
        ...valores,
        professorId: professor.id,
        numero: sql`(select coalesce(max(${schema.recibos.numero}), 0) + 1 from ${schema.recibos} where ${schema.recibos.professorId} = ${professor.id})`,
      })
      .returning({ id: schema.recibos.id });
    reciboId = novo.id;

    // recibo de um pagamento que estava só marcado no Financeiro: o recibo o substitui (não conta duas vezes)
    const pagamentoId = Number(dados.get("pagamentoId"));
    if (pagamentoId) {
      const { pagamentos } = schema;
      await db
        .delete(pagamentos)
        .where(
          and(
            eq(pagamentos.id, pagamentoId),
            eq(pagamentos.professorId, professor.id),
            alunoId ? eq(pagamentos.alunoId, alunoId) : eq(pagamentos.instituicaoId, instituicaoId),
          ),
        );
    }
  }

  revalidatePath("/", "layout");
  redirect(`/recibos/${reciboId}`);
}

/** Exclui o recibo. `voltar` = false quando a exclusão é feita pela janela da lista (a lista só atualiza). */
export async function excluirRecibo(id: number, voltar = true) {
  const professor = await exigirProfessor("recibos");
  const db = await getDb();
  await db.delete(schema.recibos).where(and(eq(schema.recibos.id, id), eq(schema.recibos.professorId, professor.id)));
  revalidatePath("/", "layout");
  if (voltar) redirect("/recibos");
}
