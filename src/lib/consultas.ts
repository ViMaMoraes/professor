import "server-only";

import { and, asc, desc, eq, exists, gte, inArray, like, lte, or, sql, sum } from "drizzle-orm";

import { getDb, schema } from "./db";

const { professores, alunos, instituicoes, presencas, recibos, materiais, materiaisAlunos } = schema;

// Estas consultas não checam a sessão: quem chama (página, action ou rota) precisa ter chamado
// exigirProfessor()/exigirAluno() antes. Todas recebem o professor (ou o aluno) dono dos dados,
// para que um professor nunca enxergue os dados de outro.

type AlunoDono = { id: number; professorId: number };

export async function listarAlunos(
  professorId: number,
  filtro: { busca?: string; situacao?: string; instituicaoId?: number } = {},
) {
  const db = await getDb();
  const condicoes = [eq(alunos.professorId, professorId)];
  if (filtro.instituicaoId) condicoes.push(eq(alunos.instituicaoId, filtro.instituicaoId));
  if (filtro.situacao === "inativos") condicoes.push(eq(alunos.ativo, false));
  else if (filtro.situacao !== "todos") condicoes.push(eq(alunos.ativo, true));
  if (filtro.busca) {
    const termo = `%${filtro.busca}%`;
    condicoes.push(or(like(alunos.nome, termo), like(alunos.instrumento, termo), like(alunos.email, termo))!);
  }
  return db
    .select()
    .from(alunos)
    .where(and(...condicoes))
    .orderBy(asc(alunos.nome));
}

export async function buscarAluno(professorId: number, id: number) {
  const db = await getDb();
  return db.query.alunos.findFirst({ where: and(eq(alunos.id, id), eq(alunos.professorId, professorId)) });
}

// As três abaixo recebem um aluno que já foi conferido (via buscarAluno ou sessão do aluno)
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

/** Materiais que o aluno pode baixar: os do professor dele marcados "para todos" e os liberados para ele. */
export async function materiaisDoAluno(aluno: AlunoDono) {
  const db = await getDb();
  return db
    .select()
    .from(materiais)
    .where(
      and(
        eq(materiais.professorId, aluno.professorId),
        or(
          eq(materiais.paraTodos, true),
          exists(
            db
              .select({ um: sql`1` })
              .from(materiaisAlunos)
              .where(and(eq(materiaisAlunos.materialId, materiais.id), eq(materiaisAlunos.alunoId, aluno.id))),
          ),
        ),
      ),
    )
    .orderBy(desc(materiais.criadoEm), desc(materiais.id));
}

export async function alunoPodeBaixar(materialId: number, aluno: AlunoDono) {
  const lista = await materiaisDoAluno(aluno);
  return lista.some((m) => m.id === materialId);
}

export async function buscarMateriaisPorIds(professorId: number, ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .select()
    .from(materiais)
    .where(and(eq(materiais.professorId, professorId), inArray(materiais.id, ids)));
}

export async function listarMateriais(professorId: number) {
  const db = await getDb();
  const lista = await db
    .select()
    .from(materiais)
    .where(eq(materiais.professorId, professorId))
    .orderBy(desc(materiais.criadoEm), desc(materiais.id));
  const vinculos = await db
    .select({ materialId: materiaisAlunos.materialId, alunoId: alunos.id, nome: alunos.nome })
    .from(materiaisAlunos)
    .innerJoin(alunos, eq(alunos.id, materiaisAlunos.alunoId))
    .where(eq(alunos.professorId, professorId))
    .orderBy(asc(alunos.nome));
  return lista.map((m) => ({ ...m, alunos: vinculos.filter((v) => v.materialId === m.id) }));
}

/** Material com a lista de alunos liberados. `professorId` nulo = sem filtro (uso interno, já conferido). */
export async function buscarMaterial(professorId: number | null, id: number) {
  const db = await getDb();
  const material = await db.query.materiais.findFirst({
    where: professorId === null ? eq(materiais.id, id) : and(eq(materiais.id, id), eq(materiais.professorId, professorId)),
  });
  if (!material) return undefined;
  const vinculos = await db
    .select({ alunoId: materiaisAlunos.alunoId })
    .from(materiaisAlunos)
    .where(eq(materiaisAlunos.materialId, id));
  return { ...material, alunoIds: vinculos.map((v) => v.alunoId) };
}

export async function listarRecibos(professorId: number, filtro: { alunoId?: number; instituicaoId?: number } = {}) {
  const db = await getDb();
  return db
    .select({
      recibo: recibos,
      aluno: { id: alunos.id, nome: alunos.nome },
      instituicao: { id: instituicoes.id, nome: instituicoes.nome },
    })
    .from(recibos)
    .leftJoin(alunos, eq(alunos.id, recibos.alunoId))
    .leftJoin(instituicoes, eq(instituicoes.id, recibos.instituicaoId))
    .where(
      and(
        eq(recibos.professorId, professorId),
        filtro.alunoId ? eq(recibos.alunoId, filtro.alunoId) : undefined,
        filtro.instituicaoId ? eq(recibos.instituicaoId, filtro.instituicaoId) : undefined,
      ),
    )
    .orderBy(desc(recibos.numero));
}

/** Recibo de um professor (dono) ou de um aluno (o próprio), com quem pagou: aluno ou instituição. */
export async function buscarRecibo(id: number, dono: { professorId: number } | { alunoId: number }) {
  const db = await getDb();
  const filtro = "professorId" in dono ? eq(recibos.professorId, dono.professorId) : eq(recibos.alunoId, dono.alunoId);
  const [linha] = await db
    .select({ recibo: recibos, aluno: alunos, instituicao: instituicoes })
    .from(recibos)
    .leftJoin(alunos, eq(alunos.id, recibos.alunoId))
    .leftJoin(instituicoes, eq(instituicoes.id, recibos.instituicaoId))
    .where(and(eq(recibos.id, id), filtro));
  return linha;
}

export async function listarInstituicoes(professorId: number, filtro: { situacao?: string } = {}) {
  const db = await getDb();
  return db
    .select({
      instituicao: instituicoes,
      // nomes qualificados à mão: dentro da subconsulta o Drizzle não prefixa a tabela
      alunosAtivos: sql<number>`(select count(*) from "alunos" a where a."instituicao_id" = "instituicoes"."id" and a."ativo" = 1)`,
    })
    .from(instituicoes)
    .where(
      and(
        eq(instituicoes.professorId, professorId),
        filtro.situacao === "todas" ? undefined : eq(instituicoes.ativo, filtro.situacao !== "inativas"),
      ),
    )
    .orderBy(asc(instituicoes.nome));
}

export async function buscarInstituicao(professorId: number, id: number) {
  const db = await getDb();
  return db.query.instituicoes.findFirst({ where: and(eq(instituicoes.id, id), eq(instituicoes.professorId, professorId)) });
}

export async function presencasNaData(professorId: number, data: string) {
  const db = await getDb();
  return db
    .select({ presenca: presencas })
    .from(presencas)
    .innerJoin(alunos, eq(alunos.id, presencas.alunoId))
    .where(and(eq(alunos.professorId, professorId), eq(presencas.data, data)))
    .then((linhas) => linhas.map((l) => l.presenca));
}

export async function historicoPresencas(
  professorId: number,
  inicio: string,
  fim: string,
  alunoId?: number,
  instituicaoId?: number,
) {
  const db = await getDb();
  return db
    .select({ presenca: presencas, aluno: { id: alunos.id, nome: alunos.nome, instrumento: alunos.instrumento } })
    .from(presencas)
    .innerJoin(alunos, eq(alunos.id, presencas.alunoId))
    .where(
      and(
        eq(alunos.professorId, professorId),
        gte(presencas.data, inicio),
        lte(presencas.data, fim),
        alunoId ? eq(presencas.alunoId, alunoId) : undefined,
        instituicaoId ? eq(alunos.instituicaoId, instituicaoId) : undefined,
      ),
    )
    .orderBy(desc(presencas.data), asc(alunos.nome));
}

export async function resumoPainel(professorId: number, hoje: string) {
  const db = await getDb();
  const inicioMes = hoje.slice(0, 8) + "01";
  const [ativos] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alunos)
    .where(and(eq(alunos.professorId, professorId), eq(alunos.ativo, true)));
  const [chamadas] = await db
    .select({ n: sql<number>`count(*)` })
    .from(presencas)
    .innerJoin(alunos, eq(alunos.id, presencas.alunoId))
    .where(and(eq(alunos.professorId, professorId), eq(presencas.data, hoje)));
  const [recebido] = await db
    .select({ total: sum(recibos.valorCentavos) })
    .from(recibos)
    .where(and(eq(recibos.professorId, professorId), gte(recibos.dataPagamento, inicioMes), lte(recibos.dataPagamento, hoje)));
  const [mats] = await db.select({ n: sql<number>`count(*)` }).from(materiais).where(eq(materiais.professorId, professorId));
  return {
    alunosAtivos: ativos.n,
    chamadasHoje: chamadas.n,
    recebidoMes: Number(recebido.total ?? 0),
    materiais: mats.n,
  };
}

/** Recebido por mês nos últimos `meses` meses (para o gráfico do painel). */
export async function recebidoPorMes(professorId: number, hoje: string, meses = 6) {
  const db = await getDb();
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - meses, 1)).toISOString().slice(0, 10);
  const linhas = await db
    .select({ mes: sql<string>`substr(${recibos.dataPagamento}, 1, 7)`, total: sum(recibos.valorCentavos) })
    .from(recibos)
    .where(and(eq(recibos.professorId, professorId), gte(recibos.dataPagamento, inicio), lte(recibos.dataPagamento, hoje)))
    .groupBy(sql`1`);
  const resultado: { mes: string; total: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const chave = new Date(Date.UTC(ano, mes - 1 - i, 1)).toISOString().slice(0, 7);
    resultado.push({ mes: chave, total: Number(linhas.find((l) => l.mes === chave)?.total ?? 0) });
  }
  return resultado;
}

export async function buscarProfessor(id: number) {
  const db = await getDb();
  return db.query.professores.findFirst({ where: eq(professores.id, id) });
}

/** Administração: todos os professores com o número de alunos ativos. */
export async function listarProfessores() {
  const db = await getDb();
  return db
    .select({
      professor: professores,
      // nomes qualificados à mão: dentro da subconsulta o Drizzle não prefixa a tabela e "id" ficaria ambíguo
      alunosAtivos: sql<number>`(select count(*) from "alunos" a where a."professor_id" = "professores"."id" and a."ativo" = 1)`,
    })
    .from(professores)
    .orderBy(desc(professores.master), asc(professores.nome));
}

/** E-mail já usado por algum professor ou aluno? (o login é único no site inteiro) */
export async function emailEmUso(email: string, ignorar: { professorId?: number; alunoId?: number } = {}) {
  const db = await getDb();
  const professor = await db.query.professores.findFirst({ where: eq(professores.email, email) });
  if (professor && professor.id !== ignorar.professorId) return true;
  const aluno = await db.query.alunos.findFirst({ where: eq(alunos.email, email) });
  return Boolean(aluno && aluno.id !== ignorar.alunoId);
}
