import "server-only";

import { and, asc, desc, eq, exists, gte, inArray, like, lte, or, sql, sum } from "drizzle-orm";

import { getDb, schema } from "./db";

const { alunos, presencas, recibos, materiais, materiaisAlunos } = schema;

// Estas consultas não checam permissão: quem chama (página, action ou rota) precisa ter
// chamado exigirProfessor()/exigirAluno() antes.

export async function listarAlunos(filtro: { busca?: string; situacao?: string } = {}) {
  const db = await getDb();
  const condicoes = [];
  if (filtro.situacao === "inativos") condicoes.push(eq(alunos.ativo, false));
  else if (filtro.situacao !== "todos") condicoes.push(eq(alunos.ativo, true));
  if (filtro.busca) {
    const termo = `%${filtro.busca}%`;
    condicoes.push(or(like(alunos.nome, termo), like(alunos.instrumento, termo), like(alunos.email, termo)));
  }
  return db
    .select()
    .from(alunos)
    .where(and(...condicoes))
    .orderBy(asc(alunos.nome));
}

export async function buscarAluno(id: number) {
  const db = await getDb();
  return db.query.alunos.findFirst({ where: eq(alunos.id, id) });
}

export async function presencasDoAluno(alunoId: number, limite = 50) {
  const db = await getDb();
  return db.select().from(presencas).where(eq(presencas.alunoId, alunoId)).orderBy(desc(presencas.data)).limit(limite);
}

export async function frequenciaDoAluno(alunoId: number) {
  const db = await getDb();
  const [linha] = await db
    .select({
      total: sql<number>`count(*)`,
      presentes: sql<number>`sum(case when ${presencas.status} in ('presente', 'reposicao') then 1 else 0 end)`,
    })
    .from(presencas)
    .where(eq(presencas.alunoId, alunoId));
  return linha.total ? Math.round((100 * linha.presentes) / linha.total) : null;
}

export async function recibosDoAluno(alunoId: number) {
  const db = await getDb();
  return db.select().from(recibos).where(eq(recibos.alunoId, alunoId)).orderBy(desc(recibos.numero));
}

/** Materiais que o aluno pode baixar: os marcados "para todos" e os liberados para ele. */
export async function materiaisDoAluno(alunoId: number) {
  const db = await getDb();
  return db
    .select()
    .from(materiais)
    .where(
      or(
        eq(materiais.paraTodos, true),
        exists(
          db
            .select({ um: sql`1` })
            .from(materiaisAlunos)
            .where(and(eq(materiaisAlunos.materialId, materiais.id), eq(materiaisAlunos.alunoId, alunoId))),
        ),
      ),
    )
    .orderBy(desc(materiais.criadoEm), desc(materiais.id));
}

export async function buscarMateriaisPorIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db.select().from(materiais).where(inArray(materiais.id, ids));
}

export async function alunoPodeBaixar(materialId: number, alunoId: number) {
  const lista = await materiaisDoAluno(alunoId);
  return lista.some((m) => m.id === materialId);
}

export async function listarMateriais() {
  const db = await getDb();
  const lista = await db.select().from(materiais).orderBy(desc(materiais.criadoEm), desc(materiais.id));
  const vinculos = await db
    .select({ materialId: materiaisAlunos.materialId, alunoId: alunos.id, nome: alunos.nome })
    .from(materiaisAlunos)
    .innerJoin(alunos, eq(alunos.id, materiaisAlunos.alunoId))
    .orderBy(asc(alunos.nome));
  return lista.map((m) => ({ ...m, alunos: vinculos.filter((v) => v.materialId === m.id) }));
}

export async function buscarMaterial(id: number) {
  const db = await getDb();
  const material = await db.query.materiais.findFirst({ where: eq(materiais.id, id) });
  if (!material) return undefined;
  const vinculos = await db
    .select({ alunoId: materiaisAlunos.alunoId })
    .from(materiaisAlunos)
    .where(eq(materiaisAlunos.materialId, id));
  return { ...material, alunoIds: vinculos.map((v) => v.alunoId) };
}

export async function listarRecibos(alunoId?: number) {
  const db = await getDb();
  return db
    .select({ recibo: recibos, aluno: { id: alunos.id, nome: alunos.nome } })
    .from(recibos)
    .innerJoin(alunos, eq(alunos.id, recibos.alunoId))
    .where(alunoId ? eq(recibos.alunoId, alunoId) : undefined)
    .orderBy(desc(recibos.numero));
}

export async function buscarRecibo(id: number) {
  const db = await getDb();
  const [linha] = await db
    .select({ recibo: recibos, aluno: alunos })
    .from(recibos)
    .innerJoin(alunos, eq(alunos.id, recibos.alunoId))
    .where(eq(recibos.id, id));
  return linha;
}

export async function presencasNaData(data: string) {
  const db = await getDb();
  return db.select().from(presencas).where(eq(presencas.data, data));
}

export async function historicoPresencas(inicio: string, fim: string, alunoId?: number) {
  const db = await getDb();
  return db
    .select({ presenca: presencas, aluno: { id: alunos.id, nome: alunos.nome, instrumento: alunos.instrumento } })
    .from(presencas)
    .innerJoin(alunos, eq(alunos.id, presencas.alunoId))
    .where(and(gte(presencas.data, inicio), lte(presencas.data, fim), alunoId ? eq(presencas.alunoId, alunoId) : undefined))
    .orderBy(desc(presencas.data), asc(alunos.nome));
}

export async function resumoPainel(hoje: string) {
  const db = await getDb();
  const inicioMes = hoje.slice(0, 8) + "01";
  const [ativos] = await db.select({ n: sql<number>`count(*)` }).from(alunos).where(eq(alunos.ativo, true));
  const [chamadas] = await db.select({ n: sql<number>`count(*)` }).from(presencas).where(eq(presencas.data, hoje));
  const [recebido] = await db
    .select({ total: sum(recibos.valorCentavos) })
    .from(recibos)
    .where(and(gte(recibos.dataPagamento, inicioMes), lte(recibos.dataPagamento, hoje)));
  const [mats] = await db.select({ n: sql<number>`count(*)` }).from(materiais);
  return {
    alunosAtivos: ativos.n,
    chamadasHoje: chamadas.n,
    recebidoMes: Number(recebido.total ?? 0),
    materiais: mats.n,
  };
}

/** Recebido por mês nos últimos `meses` meses (para o gráfico do painel). */
export async function recebidoPorMes(hoje: string, meses = 6) {
  const db = await getDb();
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - meses, 1)).toISOString().slice(0, 10);
  const linhas = await db
    .select({ mes: sql<string>`substr(${recibos.dataPagamento}, 1, 7)`, total: sum(recibos.valorCentavos) })
    .from(recibos)
    .where(and(gte(recibos.dataPagamento, inicio), lte(recibos.dataPagamento, hoje)))
    .groupBy(sql`1`);
  const resultado: { mes: string; total: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const chave = new Date(Date.UTC(ano, mes - 1 - i, 1)).toISOString().slice(0, 7);
    resultado.push({ mes: chave, total: Number(linhas.find((l) => l.mes === chave)?.total ?? 0) });
  }
  return resultado;
}

export async function professorPrincipal() {
  const db = await getDb();
  return db.query.professores.findFirst();
}
