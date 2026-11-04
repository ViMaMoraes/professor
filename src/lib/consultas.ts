import "server-only";

import { and, asc, desc, eq, exists, gte, inArray, isNull, like, lte, or, sql, sum } from "drizzle-orm";

import { montarAgenda } from "./agenda";
import { getDb, schema } from "./db";
import { foraDaCobranca, montarFinanceiro, type Lancamento, type Pagador } from "./financeiro";
import { sugestoesDeCodigo } from "./usuario";

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

/** Alunos ativos do professor (é o que conta no limite do plano). */
export async function contarAlunosAtivos(professorId: number) {
  const db = await getDb();
  const [linha] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alunos)
    .where(and(eq(alunos.professorId, professorId), eq(alunos.ativo, true)));
  return Number(linha?.n ?? 0);
}

/** E-mail de login de professor já usado? (o login do professor é único no site inteiro) */
export async function emailEmUso(email: string, ignorar: { professorId?: number } = {}) {
  const db = await getDb();
  const professor = await db.query.professores.findFirst({ where: eq(professores.email, email) });
  return Boolean(professor && professor.id !== ignorar.professorId);
}

/**
 * Aluno DESTE professor que já usa o usuário (ou null). O usuário é único por professor: alunos de
 * professores diferentes podem ter o mesmo, porque o código do professor separa os dois no login.
 */
export async function alunoComUsuario(professorId: number, usuario: string, ignorarAlunoId?: number) {
  const db = await getDb();
  const aluno = await db.query.alunos.findFirst({
    where: and(eq(alunos.professorId, professorId), eq(alunos.usuario, usuario)),
    columns: { id: true, nome: true, ativo: true },
  });
  return aluno && aluno.id !== ignorarAlunoId ? aluno : null;
}

/** Primeira variação livre do usuário neste professor: "nicolas", "nicolas2", "nicolas3"... */
export async function usuarioLivre(professorId: number, base: string, ignorarAlunoId?: number) {
  for (let n = 1; n < 100; n++) {
    const candidato = n === 1 ? base : `${base}${n}`;
    if (!(await alunoComUsuario(professorId, candidato, ignorarAlunoId))) return candidato;
  }
  return `${base}${Date.now() % 10000}`;
}

/** Professor pelo código (o que o aluno digita no login ou vem no link). */
export async function professorPorCodigo(codigo: string) {
  const db = await getDb();
  return (await db.query.professores.findFirst({ where: eq(professores.codigo, codigo) })) ?? null;
}

/** Código de professor já usado por outro professor? */
export async function codigoEmUso(codigo: string, ignorarProfessorId?: number) {
  const professor = await professorPorCodigo(codigo);
  return Boolean(professor && professor.id !== ignorarProfessorId);
}

/** Primeiro código livre para o nome (marcus, marcusmoraes, mvmoraes, marcus2...). */
export async function codigoLivre(nome: string) {
  const opcoes = sugestoesDeCodigo(nome);
  for (const c of opcoes) if (!(await codigoEmUso(c))) return c;
  for (let n = 2; n < 1000; n++) if (!(await codigoEmUso(`${opcoes[0]}${n}`))) return `${opcoes[0]}${n}`;
  return `${opcoes[0]}${Date.now() % 100000}`;
}

/** Professor sem código (conta de antes do código existir): gera e grava um agora. */
export async function garantirCodigo<P extends { id: number; nome: string; codigo: string | null }>(
  professor: P,
): Promise<Omit<P, "codigo"> & { codigo: string }> {
  if (professor.codigo) return { ...professor, codigo: professor.codigo };
  const db = await getDb();
  const codigo = await codigoLivre(professor.nome);
  await db.update(professores).set({ codigo }).where(and(eq(professores.id, professor.id), isNull(professores.codigo)));
  const atual = await db.query.professores.findFirst({ where: eq(professores.id, professor.id), columns: { codigo: true } });
  return { ...professor, codigo: atual?.codigo ?? codigo };
}

/**
 * Qual aluno está entrando. Com o código do professor, procura só entre os alunos dele.
 * Sem o código (link antigo ou aluno que entrava só com o usuário):
 * 1. aluno de usuário antigo (de quando o usuário era único no site) → ele;
 * 2. senão, se só um aluno ativo no site tem esse usuário → ele;
 * 3. mais de um → pede o código do professor.
 */
export async function alunoParaEntrar(usuario: string, codigo: string): Promise<{ aluno: typeof alunos.$inferSelect } | { erro: string }> {
  const db = await getDb();
  const naoEncontrado = { erro: "Usuário não encontrado. Confira com seu professor." };
  if (codigo) {
    const professor = await professorPorCodigo(codigo);
    if (!professor) return { erro: "Código do professor não encontrado. Confira o link ou o código que seu professor te passou." };
    const aluno = await db.query.alunos.findFirst({
      where: and(eq(alunos.professorId, professor.id), eq(alunos.usuario, usuario), eq(alunos.ativo, true)),
    });
    return aluno ? { aluno } : naoEncontrado;
  }
  const antigo = await db.query.alunos.findFirst({
    where: and(eq(alunos.usuario, usuario), eq(alunos.usuarioGlobal, true), eq(alunos.ativo, true)),
  });
  if (antigo) return { aluno: antigo };
  const candidatos = await db.query.alunos.findMany({ where: and(eq(alunos.usuario, usuario), eq(alunos.ativo, true)), limit: 2 });
  if (candidatos.length === 1) return { aluno: candidatos[0] };
  if (candidatos.length > 1) return { erro: "Informe também o código do professor (ele vem no link que seu professor te mandou)." };
  return naoEncontrado;
}

/** Avisos que o aluno recebeu: os "para todos" do professor dele e os enviados para ele. */
export async function avisosDoAluno(aluno: AlunoDono, limite = 10) {
  const db = await getDb();
  return db
    .select()
    .from(schema.avisos)
    .where(
      and(
        eq(schema.avisos.professorId, aluno.professorId),
        or(
          eq(schema.avisos.paraTodos, true),
          exists(
            db
              .select({ um: sql`1` })
              .from(schema.avisosAlunos)
              .where(and(eq(schema.avisosAlunos.avisoId, schema.avisos.id), eq(schema.avisosAlunos.alunoId, aluno.id))),
          ),
        ),
      ),
    )
    .orderBy(desc(schema.avisos.criadoEm), desc(schema.avisos.id))
    .limit(limite);
}

/** Avisos enviados pelo professor, com quantos alunos receberam (quando não foi para todos). */
export async function listarAvisos(professorId: number) {
  const db = await getDb();
  return db
    .select({
      aviso: schema.avisos,
      destinatarios: sql<number>`(select count(*) from avisos_alunos where avisos_alunos.aviso_id = "avisos"."id")`,
    })
    .from(schema.avisos)
    .where(eq(schema.avisos.professorId, professorId))
    .orderBy(desc(schema.avisos.criadoEm), desc(schema.avisos.id))
    .limit(100);
}

/** Inscrições de notificação dos alunos do professor (quantos aparelhos recebem avisos). */
export async function contarInscritos(professorId: number) {
  const db = await getDb();
  const [linha] = await db
    .select({ total: sql<number>`count(distinct ${schema.pushInscricoes.alunoId})` })
    .from(schema.pushInscricoes)
    .innerJoin(alunos, eq(alunos.id, schema.pushInscricoes.alunoId))
    .where(eq(alunos.professorId, professorId));
  return linha?.total ?? 0;
}

/** Diário de aulas do aluno (mais recentes primeiro). `soVisiveis` = o que o aluno pode ver no acesso dele. */
export async function diarioDoAluno(alunoId: number, { soVisiveis = false, limite = 100 } = {}) {
  const db = await getDb();
  const { diario } = schema;
  const condicoes = [eq(diario.alunoId, alunoId)];
  if (soVisiveis) condicoes.push(eq(diario.visivelAluno, true));
  return db
    .select()
    .from(diario)
    .where(and(...condicoes))
    .orderBy(desc(diario.data), desc(diario.id))
    .limit(limite);
}

/** Financeiro do mês: cada aluno particular/instituição com o que deve, o que pagou e a situação. */
export async function financeiroDoMes(professorId: number, mes: string, hoje: string, diaPadrao: number) {
  const db = await getDb();
  const { pagamentos } = schema;
  const [listaAlunos, listaInstituicoes, recibosDoMes, pagamentosDoMes] = await Promise.all([
    db.select().from(alunos).where(eq(alunos.professorId, professorId)),
    db.select().from(instituicoes).where(eq(instituicoes.professorId, professorId)),
    db
      .select()
      .from(recibos)
      .where(and(eq(recibos.professorId, professorId), eq(recibos.referencia, mes))),
    db
      .select()
      .from(pagamentos)
      .where(and(eq(pagamentos.professorId, professorId), eq(pagamentos.referencia, mes))),
  ]);

  const pagadores: Pagador[] = [
    ...listaAlunos.map((a) => ({
      tipo: "aluno" as const,
      id: a.id,
      nome: a.nome,
      valorCentavos: a.mensalidadeCentavos,
      diaVencimento: a.diaVencimento,
      telefone: a.telefone,
      contato: a.responsavel,
      ativo: a.ativo,
      pagoPorInstituicao: Boolean(a.instituicaoId),
      desde: a.dataInicio ?? a.criadoEm?.slice(0, 10) ?? null,
    })),
    ...listaInstituicoes.map((i) => ({
      tipo: "instituicao" as const,
      id: i.id,
      nome: i.nome,
      valorCentavos: i.valorMensalCentavos,
      diaVencimento: i.diaVencimento,
      telefone: i.telefone,
      contato: i.contato,
      ativo: i.ativo,
      desde: i.criadoEm.slice(0, 10),
    })),
  ];
  const lancamentos: Lancamento[] = [
    ...recibosDoMes.map((r) => ({
      origem: "recibo" as const,
      id: r.id,
      tipo: r.instituicaoId ? ("instituicao" as const) : ("aluno" as const),
      pagadorId: (r.instituicaoId ?? r.alunoId)!,
      valorCentavos: r.valorCentavos,
      dataPagamento: r.dataPagamento,
      formaPagamento: r.formaPagamento,
      numero: r.numero,
    })),
    ...pagamentosDoMes.map((p) => ({
      origem: "manual" as const,
      id: p.id,
      tipo: p.instituicaoId ? ("instituicao" as const) : ("aluno" as const),
      pagadorId: (p.instituicaoId ?? p.alunoId)!,
      valorCentavos: p.valorCentavos,
      dataPagamento: p.dataPagamento,
      formaPagamento: p.formaPagamento,
    })),
  ];
  const linhas = montarFinanceiro(pagadores, lancamentos, mes, hoje, diaPadrao);
  const fora = foraDaCobranca(pagadores, mes, new Set(linhas.map((l) => `${l.pagador.tipo}-${l.pagador.id}`)));
  return { linhas, fora };
}

export async function buscarPagamento(professorId: number, id: number) {
  const db = await getDb();
  const { pagamentos } = schema;
  return db.query.pagamentos.findFirst({ where: and(eq(pagamentos.id, id), eq(pagamentos.professorId, professorId)) });
}

/** Agenda (aulas fixas, desmarcadas e reposições agendadas) entre duas datas; opcionalmente de um aluno só. */
export async function agendaDoPeriodo(
  professor: { id: number; duracaoAula: number },
  de: string,
  ate: string,
  filtro: { alunoId?: number } = {},
) {
  const db = await getDb();
  const { horarios, aulasDesmarcadas, reposicoes: rep } = schema;
  const doAluno = filtro.alunoId ? [eq(alunos.id, filtro.alunoId)] : [];
  const [listaHorarios, desmarcadas, agendadas] = await Promise.all([
    db
      .select({
        alunoId: alunos.id,
        nome: alunos.nome,
        diaSemana: horarios.diaSemana,
        hora: horarios.hora,
        duracaoMin: horarios.duracaoMin,
        // sem "início das aulas", vale a data do cadastro (o calendário não mostra aulas antes do aluno existir)
        inicio: sql<string | null>`coalesce(${alunos.dataInicio}, substr(${alunos.criadoEm}, 1, 10))`,
      })
      .from(horarios)
      .innerJoin(alunos, eq(alunos.id, horarios.alunoId))
      .where(and(eq(alunos.professorId, professor.id), eq(alunos.ativo, true), ...doAluno)),
    db
      .select()
      .from(aulasDesmarcadas)
      .where(
        and(
          eq(aulasDesmarcadas.professorId, professor.id),
          gte(aulasDesmarcadas.data, de),
          lte(aulasDesmarcadas.data, ate),
          ...(filtro.alunoId ? [eq(aulasDesmarcadas.alunoId, filtro.alunoId)] : []),
        ),
      ),
    db
      .select({ id: rep.id, alunoId: rep.alunoId, nome: alunos.nome, data: rep.data, hora: rep.hora, duracaoMin: rep.duracaoMin, motivo: rep.motivo })
      .from(rep)
      .innerJoin(alunos, eq(alunos.id, rep.alunoId))
      .where(and(eq(rep.professorId, professor.id), gte(rep.data, de), lte(rep.data, ate), ...doAluno)),
  ]);
  return montarAgenda({
    horarios: listaHorarios,
    desmarcadas,
    reposicoes: agendadas.map((r) => ({ ...r, data: r.data! })),
    de,
    ate,
    duracaoPadrao: professor.duracaoAula,
  });
}

export async function horariosDoAluno(alunoId: number) {
  const db = await getDb();
  return db.select().from(schema.horarios).where(eq(schema.horarios.alunoId, alunoId)).orderBy(asc(schema.horarios.diaSemana), asc(schema.horarios.hora));
}

/** Horários de todos os alunos do professor, por aluno (para listas). */
export async function horariosPorAluno(professorId: number) {
  const db = await getDb();
  const linhas = await db
    .select({ alunoId: schema.horarios.alunoId, diaSemana: schema.horarios.diaSemana, hora: schema.horarios.hora })
    .from(schema.horarios)
    .innerJoin(alunos, eq(alunos.id, schema.horarios.alunoId))
    .where(eq(alunos.professorId, professorId));
  return Map.groupBy(linhas, (h) => h.alunoId);
}

/** Reposições concedidas e ainda sem data (a marcar). */
export async function reposicoesPendentes(professorId: number, alunoId?: number) {
  const db = await getDb();
  const { reposicoes: rep } = schema;
  return db
    .select({ id: rep.id, alunoId: rep.alunoId, nome: alunos.nome, motivo: rep.motivo, criadoEm: rep.criadoEm })
    .from(rep)
    .innerJoin(alunos, eq(alunos.id, rep.alunoId))
    .where(and(eq(rep.professorId, professorId), isNull(rep.data), ...(alunoId ? [eq(rep.alunoId, alunoId)] : [])))
    .orderBy(asc(rep.criadoEm));
}

/** Todas as reposições do aluno (a marcar primeiro, depois as datas mais recentes). */
export async function reposicoesDoAluno(professorId: number, alunoId: number) {
  const db = await getDb();
  const { reposicoes: rep } = schema;
  return db
    .select()
    .from(rep)
    .where(and(eq(rep.professorId, professorId), eq(rep.alunoId, alunoId)))
    .orderBy(sql`${rep.data} is not null`, desc(rep.data), desc(rep.hora), desc(rep.id));
}

// ---- vídeos ----

export async function listarModulos(professorId: number) {
  const db = await getDb();
  return db.select().from(schema.modulos).where(eq(schema.modulos.professorId, professorId)).orderBy(asc(schema.modulos.ordem), asc(schema.modulos.id));
}

/** Quem pode ver cada vídeo do professor (ids de alunos ativos), para contar "visto por X de Y". */
async function acessoAosVideos(professorId: number) {
  const db = await getDb();
  const { videos, videosAlunos, visualizacoes } = schema;
  const [lista, ativos, liberados, vistas] = await Promise.all([
    db.select().from(videos).where(eq(videos.professorId, professorId)).orderBy(asc(videos.ordem), asc(videos.id)),
    db.select({ id: alunos.id, nome: alunos.nome }).from(alunos).where(and(eq(alunos.professorId, professorId), eq(alunos.ativo, true))).orderBy(asc(alunos.nome)),
    db
      .select({ videoId: videosAlunos.videoId, alunoId: videosAlunos.alunoId })
      .from(videosAlunos)
      .innerJoin(videos, eq(videos.id, videosAlunos.videoId))
      .where(eq(videos.professorId, professorId)),
    db
      .select({ videoId: visualizacoes.videoId, alunoId: visualizacoes.alunoId, primeiraVez: visualizacoes.primeiraVez, ultimaVez: visualizacoes.ultimaVez, vezes: visualizacoes.vezes })
      .from(visualizacoes)
      .innerJoin(videos, eq(videos.id, visualizacoes.videoId))
      .where(eq(videos.professorId, professorId)),
  ]);
  const liberadosPor = Map.groupBy(liberados, (l) => l.videoId);
  const vistasPor = Map.groupBy(vistas, (v) => v.videoId);
  const publico = (v: (typeof lista)[number]) => {
    if (v.paraTodos) return ativos;
    const ids = new Set((liberadosPor.get(v.id) ?? []).map((l) => l.alunoId));
    return ativos.filter((a) => ids.has(a.id));
  };
  return { lista, publico, vistasPor, liberadosPor };
}

/** Vídeos do professor com "visto por X de Y" (só alunos ativos que podem ver). */
export async function listarVideos(professorId: number) {
  const { lista, publico, vistasPor } = await acessoAosVideos(professorId);
  return lista.map((v) => {
    const quem = publico(v);
    const viram = new Set((vistasPor.get(v.id) ?? []).map((x) => x.alunoId));
    return { video: v, publico: quem.length, vistos: quem.filter((a) => viram.has(a.id)).length };
  });
}

/** Um vídeo do professor, com os alunos liberados (para editar) e quem assistiu ou não. */
export async function buscarVideo(professorId: number, id: number) {
  const { lista, publico, vistasPor, liberadosPor } = await acessoAosVideos(professorId);
  const video = lista.find((v) => v.id === id);
  if (!video) return undefined;
  const vistas = new Map((vistasPor.get(id) ?? []).map((x) => [x.alunoId, x]));
  return {
    video,
    alunoIds: (liberadosPor.get(id) ?? []).map((l) => l.alunoId),
    assistiu: publico(video).map((a) => ({ ...a, visualizacao: vistas.get(a.id) ?? null })),
  };
}

/** Vídeos que o aluno pode ver (para todos ou liberados para ele), com o que ele já assistiu. */
export async function videosDoAluno(aluno: AlunoDono) {
  const db = await getDb();
  const { videos, videosAlunos, visualizacoes } = schema;
  const [lista, vistas, mods] = await Promise.all([
    db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.professorId, aluno.professorId),
          or(
            eq(videos.paraTodos, true),
            exists(
              db
                .select({ um: sql`1` })
                .from(videosAlunos)
                .where(and(eq(videosAlunos.videoId, videos.id), eq(videosAlunos.alunoId, aluno.id))),
            ),
          ),
        ),
      )
      .orderBy(asc(videos.ordem), asc(videos.id)),
    db.select({ videoId: visualizacoes.videoId }).from(visualizacoes).where(eq(visualizacoes.alunoId, aluno.id)),
    listarModulos(aluno.professorId),
  ]);
  const vistos = new Set(vistas.map((v) => v.videoId));
  return { videos: lista.map((v) => ({ ...v, visto: vistos.has(v.id) })), modulos: mods };
}
