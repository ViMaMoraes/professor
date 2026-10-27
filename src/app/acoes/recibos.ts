"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirProfessor } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { isoValido, lerValorEmCentavos } from "@/lib/formato";

export async function criarRecibo(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirProfessor();
  const db = await getDb();

  const alunoId = Number(dados.get("alunoId"));
  const valor = lerValorEmCentavos(dados.get("valor"));
  const dataPagamento = texto(dados, "dataPagamento");
  const referente = texto(dados, "referente");

  const aluno = alunoId ? await db.query.alunos.findFirst({ where: eq(schema.alunos.id, alunoId) }) : undefined;
  if (!aluno) return { erro: "Escolha o aluno." };
  if (!valor) return { erro: "Informe um valor válido." };
  if (!isoValido(dataPagamento)) return { erro: "Informe a data do pagamento." };
  if (!referente) return { erro: "Informe a que se refere o pagamento." };

  const recibo = await db.transaction(async (tx) => {
    const [{ ultimo }] = await tx.select({ ultimo: sql<number | null>`max(${schema.recibos.numero})` }).from(schema.recibos);
    const [novo] = await tx
      .insert(schema.recibos)
      .values({
        numero: (ultimo ?? 0) + 1,
        alunoId,
        valorCentavos: valor,
        referente,
        dataPagamento,
        formaPagamento: texto(dados, "formaPagamento"),
        observacoes: texto(dados, "observacoes"),
      })
      .returning();
    return novo;
  });

  revalidatePath("/", "layout");
  redirect(`/recibos/${recibo.id}`);
}

export async function excluirRecibo(id: number) {
  await exigirProfessor();
  const db = await getDb();
  await db.delete(schema.recibos).where(eq(schema.recibos.id, id));
  revalidatePath("/", "layout");
  redirect("/recibos");
}
