"use server";

import { and, eq } from "drizzle-orm";
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

  // tudo num batch só (o D1 da Cloudflare não tem transações, mas executa o batch de uma vez)
  const comandos = ids.map((alunoId) => {
    const status = String(dados.get(`status_${alunoId}`) ?? "");
    const observacao = texto(dados, `obs_${alunoId}`);
    if (status in STATUS_PRESENCA) {
      marcados++;
      return db
        .insert(presencas)
        .values({ alunoId, data, status: status as StatusPresenca, observacao })
        .onConflictDoUpdate({ target: [presencas.alunoId, presencas.data], set: { status: status as StatusPresenca, observacao } });
    }
    // "sem registro" apaga a marcação existente
    return db.delete(presencas).where(and(eq(presencas.data, data), eq(presencas.alunoId, alunoId)));
  });
  if (comandos.length) await db.batch(comandos as [(typeof comandos)[number], ...typeof comandos]);

  revalidatePath("/", "layout");
  return { ok: `Chamada de ${dataBR(data)} salva (${marcados} ${marcados === 1 ? "registro" : "registros"}).` };
}
