"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { STATUS_PRESENCA } from "@/lib/constantes";
import { exigirProfessor } from "@/lib/auth";
import { cursosDaConta, listarAlunos } from "@/lib/consultas";
import { getDb, schema } from "@/lib/db";
import type { StatusPresenca } from "@/lib/db/schema";
import { texto, type EstadoForm } from "@/lib/estado-form";
import { dataBR, isoValido } from "@/lib/formato";

export async function salvarChamada(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const professor = await exigirProfessor("chamada");
  const data = texto(dados, "data");
  if (!isoValido(data)) return { erro: "Data inválida." };

  // só aceita aulas de alunos deste professor e, na equipe que só vê os próprios alunos, só dos cursos dela
  const meus = new Set((await listarAlunos(professor, { situacao: "todos" })).map((a) => a.id));
  const cursos = new Map((await cursosDaConta(professor)).map((c) => [c.id, c.alunoId]));
  const aulas = dados
    .getAll("aulas")
    .map(String)
    .map((chave) => {
      const [alunoId, cursoId] = chave.split("-").map(Number);
      return { chave, alunoId, cursoId: cursoId || 0 };
    })
    .filter((a) => meus.has(a.alunoId) && (a.cursoId === 0 || cursos.get(a.cursoId) === a.alunoId));
  const db = await getDb();
  const { presencas } = schema;
  let marcados = 0;

  // tudo num batch só (o D1 da Cloudflare não tem transações, mas executa o batch de uma vez)
  const comandos = aulas.map(({ chave, alunoId, cursoId }) => {
    const status = String(dados.get(`status_${chave}`) ?? "");
    const observacao = texto(dados, `obs_${chave}`);
    if (status in STATUS_PRESENCA) {
      marcados++;
      return db
        .insert(presencas)
        .values({ alunoId, data, cursoId, status: status as StatusPresenca, observacao })
        .onConflictDoUpdate({ target: [presencas.alunoId, presencas.data, presencas.cursoId], set: { status: status as StatusPresenca, observacao } });
    }
    // "sem registro" apaga a marcação existente
    return db.delete(presencas).where(and(eq(presencas.data, data), eq(presencas.alunoId, alunoId), eq(presencas.cursoId, cursoId)));
  });
  if (comandos.length) await db.batch(comandos as [(typeof comandos)[number], ...typeof comandos]);

  revalidatePath("/", "layout");
  return { ok: `Chamada de ${dataBR(data)} salva (${marcados} ${marcados === 1 ? "registro" : "registros"}).` };
}
