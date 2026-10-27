"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { STATUS_PRESENCA } from "@/lib/constantes";
import { exigirProfessor } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { StatusPresenca } from "@/lib/db/schema";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { dataBR, isoValido } from "@/lib/formato";

export async function salvarChamada(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirProfessor();
  const data = texto(dados, "data");
  if (!isoValido(data)) return { erro: "Data inválida." };

  const ids = dados.getAll("alunos").map(Number).filter(Number.isInteger);
  const db = await getDb();
  const { presencas } = schema;
  let marcados = 0;

  await db.transaction(async (tx) => {
    for (const alunoId of ids) {
      const status = String(dados.get(`status_${alunoId}`) ?? "");
      const observacao = texto(dados, `obs_${alunoId}`);
      if (status in STATUS_PRESENCA) {
        await tx
          .insert(presencas)
          .values({ alunoId, data, status: status as StatusPresenca, observacao })
          .onConflictDoUpdate({ target: [presencas.alunoId, presencas.data], set: { status: status as StatusPresenca, observacao } });
        marcados++;
      } else {
        // "sem registro" apaga a marcação existente
        await tx.delete(presencas).where(and(eq(presencas.data, data), inArray(presencas.alunoId, [alunoId])));
      }
    }
  });

  revalidatePath("/", "layout");
  return { ok: `Chamada de ${dataBR(data)} salva (${marcados} ${marcados === 1 ? "registro" : "registros"}).` };
}
