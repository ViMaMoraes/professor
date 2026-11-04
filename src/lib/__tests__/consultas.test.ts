import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

// banco isolado numa pasta temporária (precisa vir antes de importar o módulo do banco)
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "professor-teste-"));

const { getDb, schema } = await import("../db");
const consultas = await import("../consultas");
const { contaLiberada } = await import("../auth");

let prof: number; // professor que usa o sistema
let outro: number; // outro professor (cliente), não pode ver nada do primeiro
let ana: { id: number; professorId: number };
let bruno: { id: number; professorId: number };
let lucas: { id: number; professorId: number };
let soDaAna: number;
let paraTodos: number;
let doOutro: number;

beforeAll(async () => {
  const db = await getDb();
  [{ id: prof }, { id: outro }] = await db
    .insert(schema.professores)
    .values([
      { nome: "Prof", email: "prof@x.com", senhaHash: "x", master: true },
      { nome: "Outra", email: "outra@x.com", senhaHash: "x" },
    ])
    .returning({ id: schema.professores.id });
  [ana, bruno, lucas] = await db
    .insert(schema.alunos)
    .values([
      { nome: "Ana", professorId: prof },
      { nome: "Bruno", professorId: prof },
      { nome: "Lucas", professorId: outro },
    ])
    .returning({ id: schema.alunos.id, professorId: schema.alunos.professorId });
  const base = { link: "https://drive.google.com/file/d/1abcdefghijk/view", tipoDrive: "arquivo" as const, driveId: "1abcdefghijk" };
  [{ id: soDaAna }, { id: paraTodos }, { id: doOutro }] = await db
    .insert(schema.materiais)
    .values([
      { ...base, titulo: "Só da Ana", professorId: prof },
      { ...base, titulo: "Para todos", paraTodos: true, professorId: prof },
      { ...base, titulo: "Para todos do outro", paraTodos: true, professorId: outro },
    ])
    .returning({ id: schema.materiais.id });
  await db.insert(schema.materiaisAlunos).values({ materialId: soDaAna, alunoId: ana.id });
});

describe("permissões da central de downloads", () => {
  it("cada aluno vê só o que foi liberado para ele, e só do próprio professor", async () => {
    expect((await consultas.materiaisDoAluno(ana)).map((m) => m.titulo).sort()).toEqual(["Para todos", "Só da Ana"]);
    expect((await consultas.materiaisDoAluno(bruno)).map((m) => m.titulo)).toEqual(["Para todos"]);
    expect((await consultas.materiaisDoAluno(lucas)).map((m) => m.titulo)).toEqual(["Para todos do outro"]);
    expect(await consultas.alunoPodeBaixar(soDaAna, bruno)).toBe(false);
    expect(await consultas.alunoPodeBaixar(soDaAna, ana)).toBe(true);
    expect(await consultas.alunoPodeBaixar(paraTodos, bruno)).toBe(true);
    expect(await consultas.alunoPodeBaixar(paraTodos, lucas)).toBe(false);
  });
});

describe("isolamento entre professores", () => {
  it("um professor não enxerga alunos, materiais nem recibos do outro", async () => {
    expect((await consultas.listarAlunos(prof)).map((a) => a.nome)).toEqual(["Ana", "Bruno"]);
    expect((await consultas.listarAlunos(outro)).map((a) => a.nome)).toEqual(["Lucas"]);
    expect(await consultas.buscarAluno(outro, ana.id)).toBeUndefined();
    expect(await consultas.buscarMaterial(outro, soDaAna)).toBeUndefined();
    expect((await consultas.buscarMateriaisPorIds(outro, [soDaAna, paraTodos, doOutro])).map((m) => m.id)).toEqual([doOutro]);
    expect((await consultas.listarMateriais(outro)).map((m) => m.titulo)).toEqual(["Para todos do outro"]);

    const db = await getDb();
    const [recibo] = await db
      .insert(schema.recibos)
      .values({ professorId: prof, numero: 1, alunoId: ana.id, valorCentavos: 100, referente: "x", dataPagamento: "2026-10-01" })
      .returning();
    expect(await consultas.buscarRecibo(recibo.id, { professorId: outro })).toBeUndefined();
    expect(await consultas.buscarRecibo(recibo.id, { alunoId: lucas.id })).toBeUndefined();
    expect((await consultas.buscarRecibo(recibo.id, { alunoId: ana.id }))?.recibo.id).toBe(recibo.id);
    expect(await consultas.listarRecibos(outro)).toEqual([]);
    // a numeração de recibo é por professor: o outro também pode ter o nº 1
    await db
      .insert(schema.recibos)
      .values({ professorId: outro, numero: 1, alunoId: lucas.id, valorCentavos: 100, referente: "x", dataPagamento: "2026-10-01" });
    expect((await consultas.resumoPainel(outro, "2026-10-27")).recebidoMes).toBe(100);
  });

  it("chamadas também ficam separadas", async () => {
    const db = await getDb();
    await db.insert(schema.presencas).values([
      { alunoId: ana.id, data: "2026-10-20", status: "presente" },
      { alunoId: lucas.id, data: "2026-10-20", status: "falta" },
    ]);
    expect((await consultas.presencasNaData(prof, "2026-10-20")).map((p) => p.alunoId)).toEqual([ana.id]);
    expect((await consultas.historicoPresencas(outro, "2026-10-01", "2026-10-31")).map((r) => r.aluno.nome)).toEqual(["Lucas"]);
  });

  it("a administração conta os alunos de cada professor", async () => {
    const linhas = await consultas.listarProfessores();
    expect(linhas.map((l) => [l.professor.nome, l.alunosAtivos])).toEqual([
      ["Prof", 2],
      ["Outra", 1],
    ]);
  });

  it("e-mail de login é único no site inteiro", async () => {
    expect(await consultas.emailEmUso("outra@x.com")).toBe(true);
    expect(await consultas.emailEmUso("outra@x.com", { professorId: outro })).toBe(false);
    expect(await consultas.emailEmUso("ninguem@x.com")).toBe(false);
  });

  it("usuário do aluno é único por professor; outro professor pode repetir", async () => {
    const db = await getDb();
    await db.update(schema.alunos).set({ usuario: "ana.souza" }).where(eq(schema.alunos.id, ana.id));
    expect((await consultas.alunoComUsuario(prof, "ana.souza"))?.id).toBe(ana.id);
    expect(await consultas.alunoComUsuario(prof, "ana.souza", ana.id)).toBeNull();
    expect(await consultas.alunoComUsuario(prof, "outro.nome")).toBeNull();
    // o mesmo usuário em outro professor não conflita
    expect(await consultas.alunoComUsuario(outro, "ana.souza")).toBeNull();
    expect(await consultas.usuarioLivre(prof, "ana.souza")).toBe("ana.souza2");
    expect(await consultas.usuarioLivre(outro, "ana.souza")).toBe("ana.souza");
    await db.update(schema.alunos).set({ usuario: null }).where(eq(schema.alunos.id, ana.id));
  });

  it("código do professor: gera um livre a partir do nome e encontra o professor por ele", async () => {
    const db = await getDb();
    await db.update(schema.professores).set({ codigo: "prof" }).where(eq(schema.professores.id, prof));
    expect(await consultas.codigoEmUso("prof")).toBe(true);
    expect(await consultas.codigoEmUso("prof", prof)).toBe(false);
    expect(await consultas.codigoLivre("Prof")).toBe("prof2");
    expect((await consultas.professorPorCodigo("prof"))?.id).toBe(prof);
    // professor sem código ganha um na primeira vez
    await db.update(schema.professores).set({ codigo: null }).where(eq(schema.professores.id, outro));
    const comCodigo = await consultas.garantirCodigo({ id: outro, nome: "Outra", codigo: null });
    expect(comCodigo.codigo).toBe("outra");
    expect((await consultas.garantirCodigo({ id: outro, nome: "Outra", codigo: null })).codigo).toBe("outra");
  });

  it("login do aluno: com código procura no professor; sem código vale o usuário antigo ou o único do site", async () => {
    const db = await getDb();
    // Ana (prof) tem usuário antigo "nicolas"; Lucas (outro) ganhou "nicolas" depois da mudança
    await db.update(schema.alunos).set({ usuario: "nicolas", usuarioGlobal: true }).where(eq(schema.alunos.id, ana.id));
    await db.update(schema.alunos).set({ usuario: "nicolas", usuarioGlobal: false }).where(eq(schema.alunos.id, lucas.id));
    const entrar = async (u: string, c: string) => {
      const r = await consultas.alunoParaEntrar(u, c);
      return "erro" in r ? r.erro : r.aluno.id;
    };
    expect(await entrar("nicolas", "prof")).toBe(ana.id);
    expect(await entrar("nicolas", "outra")).toBe(lucas.id);
    expect(await entrar("nicolas", "")).toBe(ana.id); // link antigo continua levando à Ana
    expect(await entrar("nicolas", "naoexiste")).toMatch(/Código do professor não encontrado/);
    // sem usuário antigo: único no site entra sem código; repetido pede o código
    await db.update(schema.alunos).set({ usuarioGlobal: false }).where(eq(schema.alunos.id, ana.id));
    expect(await entrar("nicolas", "")).toMatch(/código do professor/);
    await db.update(schema.alunos).set({ usuario: null }).where(eq(schema.alunos.id, ana.id));
    expect(await entrar("nicolas", "")).toBe(lucas.id);
    expect(await entrar("ninguem", "")).toMatch(/não encontrado/);
    // aluno inativo não entra
    await db.update(schema.alunos).set({ ativo: false }).where(eq(schema.alunos.id, lucas.id));
    expect(await entrar("nicolas", "outra")).toMatch(/não encontrado/);
    await db.update(schema.alunos).set({ ativo: true, usuario: null }).where(eq(schema.alunos.id, lucas.id));
  });
});

describe("avisos", () => {
  it("cada aluno vê os avisos para todos e os enviados para ele, só do próprio professor", async () => {
    const db = await getDb();
    const [geral, soBruno, doOutroProf] = await db
      .insert(schema.avisos)
      .values([
        { professorId: prof, titulo: "Geral", criadoEm: "2026-10-01 10:00:00" },
        { professorId: prof, titulo: "Só Bruno", paraTodos: false, criadoEm: "2026-10-02 10:00:00" },
        { professorId: outro, titulo: "Do outro", criadoEm: "2026-10-03 10:00:00" },
      ])
      .returning();
    await db.insert(schema.avisosAlunos).values({ avisoId: soBruno.id, alunoId: bruno.id });

    expect((await consultas.avisosDoAluno(ana)).map((a) => a.titulo)).toEqual(["Geral"]);
    expect((await consultas.avisosDoAluno(bruno)).map((a) => a.titulo)).toEqual(["Só Bruno", "Geral"]);
    expect((await consultas.avisosDoAluno(lucas)).map((a) => a.titulo)).toEqual(["Do outro"]);
    expect((await consultas.listarAvisos(prof)).map((l) => [l.aviso.titulo, l.destinatarios])).toEqual([
      ["Só Bruno", 1],
      ["Geral", 0],
    ]);

    await db.insert(schema.pushInscricoes).values({ alunoId: bruno.id, endpoint: "https://push.example/1", p256dh: "chave-p256dh", auth: "auth1" });
    expect(await consultas.contarInscritos(prof)).toBe(1);
    expect(await consultas.contarInscritos(outro)).toBe(0);

    for (const a of [geral, soBruno, doOutroProf]) await db.delete(schema.avisos).where(eq(schema.avisos.id, a.id));
    await db.delete(schema.pushInscricoes);
  });
});

describe("instituições", () => {
  it("recibo no nome da instituição e chamada separada por aluno", async () => {
    const db = await getDb();
    const [escola] = await db.insert(schema.instituicoes).values({ professorId: prof, nome: "Escola X" }).returning();
    const [fe, ga] = await db
      .insert(schema.alunos)
      .values([
        { professorId: prof, nome: "Fernanda", instituicaoId: escola.id },
        { professorId: prof, nome: "Gabriel", instituicaoId: escola.id },
      ])
      .returning();
    await db.insert(schema.presencas).values([
      { alunoId: fe.id, data: "2026-10-21", status: "presente" },
      { alunoId: ga.id, data: "2026-10-21", status: "falta" },
      { alunoId: ana.id, data: "2026-10-21", status: "presente" },
    ]);
    const [recibo] = await db
      .insert(schema.recibos)
      .values({ professorId: prof, numero: 50, instituicaoId: escola.id, valorCentavos: 60000, referente: "x", dataPagamento: "2026-10-21" })
      .returning();

    expect((await consultas.listarAlunos(prof, { instituicaoId: escola.id })).map((a) => a.nome)).toEqual(["Fernanda", "Gabriel"]);
    const chamada = await consultas.historicoPresencas(prof, "2026-10-21", "2026-10-21", undefined, escola.id);
    expect(chamada.map((c) => [c.aluno.nome, c.presenca.status])).toEqual([
      ["Fernanda", "presente"],
      ["Gabriel", "falta"],
    ]);
    const lista = await consultas.listarRecibos(prof, { instituicaoId: escola.id });
    expect(lista.map((l) => [l.recibo.numero, l.instituicao?.nome, l.aluno])).toEqual([[50, "Escola X", null]]);
    const completo = await consultas.buscarRecibo(recibo.id, { professorId: prof });
    expect(completo?.instituicao?.nome).toBe("Escola X");
    expect(completo?.aluno).toBeNull();
    // o aluno não acessa o recibo da instituição pelo portal
    expect(await consultas.buscarRecibo(recibo.id, { alunoId: fe.id })).toBeUndefined();
    // outro professor não vê a instituição
    expect(await consultas.buscarInstituicao(outro, escola.id)).toBeUndefined();
    expect((await consultas.listarInstituicoes(prof)).map((l) => [l.instituicao.nome, l.alunosAtivos])).toEqual([["Escola X", 2]]);

    // excluir a instituição apaga os recibos dela, mas os alunos continuam (sem vínculo)
    await db.delete(schema.instituicoes).where(eq(schema.instituicoes.id, escola.id));
    expect(await consultas.listarRecibos(prof, { instituicaoId: escola.id })).toEqual([]);
    expect((await consultas.buscarAluno(prof, fe.id))?.instituicaoId).toBeNull();
    await db.delete(schema.alunos).where(eq(schema.alunos.id, fe.id));
    await db.delete(schema.alunos).where(eq(schema.alunos.id, ga.id));
  });
});

describe("contas e validade", () => {
  it("bloqueio e vencimento (o master nunca é bloqueado)", () => {
    const hoje = "2026-10-27";
    expect(contaLiberada({ master: false, ativo: true, acessoAte: null }, hoje)).toBe(true);
    expect(contaLiberada({ master: false, ativo: true, acessoAte: "2026-10-27" }, hoje)).toBe(true);
    expect(contaLiberada({ master: false, ativo: true, acessoAte: "2026-10-26" }, hoje)).toBe(false);
    expect(contaLiberada({ master: false, ativo: false, acessoAte: null }, hoje)).toBe(false);
    expect(contaLiberada({ master: true, ativo: false, acessoAte: "2020-01-01" }, hoje)).toBe(true);
  });

  it("excluir o professor apaga tudo dele (cascata)", async () => {
    const db = await getDb();
    await db.delete(schema.professores).where(eq(schema.professores.id, outro));
    expect(await db.select().from(schema.alunos).where(eq(schema.alunos.professorId, outro))).toEqual([]);
    expect(await db.select().from(schema.materiais).where(eq(schema.materiais.professorId, outro))).toEqual([]);
    expect(await db.select().from(schema.recibos).where(eq(schema.recibos.professorId, outro))).toEqual([]);
    expect(await db.select().from(schema.presencas).where(eq(schema.presencas.alunoId, lucas.id))).toEqual([]);
    // os dados do primeiro professor continuam lá
    expect((await consultas.listarAlunos(prof)).length).toBe(2);
  });
});

describe("chamada e recibos", () => {
  it("frequência conta presença e reposição", async () => {
    const db = await getDb();
    await db.insert(schema.presencas).values([
      { alunoId: bruno.id, data: "2026-10-05", status: "presente" },
      { alunoId: bruno.id, data: "2026-10-12", status: "falta" },
      { alunoId: bruno.id, data: "2026-10-19", status: "reposicao" },
      { alunoId: bruno.id, data: "2026-10-26", status: "justificada" },
    ]);
    expect(await consultas.frequenciaDoAluno(bruno.id)).toBe(50);
  });

  it("soma recebimentos por mês, incluindo meses vazios", async () => {
    const db = await getDb();
    await db.insert(schema.recibos).values([
      { professorId: prof, numero: 10, alunoId: ana.id, valorCentavos: 15000, referente: "x", dataPagamento: "2026-08-05" },
      { professorId: prof, numero: 11, alunoId: ana.id, valorCentavos: 15000, referente: "x", dataPagamento: "2026-10-05" },
      { professorId: prof, numero: 12, alunoId: ana.id, valorCentavos: 5000, referente: "x", dataPagamento: "2026-10-20" },
    ]);
    expect(await consultas.recebidoPorMes(prof, "2026-10-27", 3)).toEqual([
      { mes: "2026-08", total: 15000 },
      { mes: "2026-09", total: 0 },
      { mes: "2026-10", total: 20100 }, // inclui o recibo de R$ 1,00 do teste de isolamento
    ]);
  });
});

describe("diário de aulas", () => {
  it("o aluno vê só os registros marcados para ele, do mais recente para o mais antigo", async () => {
    const db = await getDb();
    await db.insert(schema.diario).values([
      { alunoId: ana.id, data: "2026-10-07", conteudo: "Escala de Dó" },
      { alunoId: ana.id, data: "2026-10-21", conteudo: "Asa Branca", paraCasa: "Treinar 10 min por dia" },
      { alunoId: ana.id, data: "2026-10-14", conteudo: "Anotação só minha", visivelAluno: false },
      { alunoId: bruno.id, data: "2026-10-21", conteudo: "Do Bruno" },
    ]);
    expect((await consultas.diarioDoAluno(ana.id)).map((r) => r.conteudo)).toEqual(["Asa Branca", "Anotação só minha", "Escala de Dó"]);
    expect((await consultas.diarioDoAluno(ana.id, { soVisiveis: true })).map((r) => r.conteudo)).toEqual(["Asa Branca", "Escala de Dó"]);
    expect((await consultas.diarioDoAluno(ana.id, { limite: 1 }))[0].paraCasa).toBe("Treinar 10 min por dia");

    // excluir o aluno apaga o diário dele
    const [temp] = await db.insert(schema.alunos).values({ nome: "Temp", professorId: prof }).returning();
    await db.insert(schema.diario).values({ alunoId: temp.id, data: "2026-10-01", conteudo: "x" });
    await db.delete(schema.alunos).where(eq(schema.alunos.id, temp.id));
    expect(await consultas.diarioDoAluno(temp.id)).toEqual([]);
  });
});

describe("financeiro", () => {
  it("junta recibos e pagamentos marcados do mês, por professor", async () => {
    const db = await getDb();
    const [escola] = await db.insert(schema.instituicoes).values({ professorId: prof, nome: "Escola Fin", valorMensalCentavos: 60000 }).returning();
    const [paga, deve, daEscola] = await db
      .insert(schema.alunos)
      .values([
        { professorId: prof, nome: "Paga Tudo", mensalidadeCentavos: 15000, dataInicio: "2026-01-01" },
        { professorId: prof, nome: "Deve Ainda", mensalidadeCentavos: 20000, dataInicio: "2026-01-01", diaVencimento: 5 },
        { professorId: prof, nome: "Da Escola", mensalidadeCentavos: 10000, instituicaoId: escola.id, dataInicio: "2026-01-01" },
      ])
      .returning();
    await db.insert(schema.recibos).values([
      // recibo de outubro pago em novembro: conta para outubro
      { professorId: prof, numero: 900, alunoId: paga.id, valorCentavos: 10000, referente: "x", dataPagamento: "2026-11-02", referencia: "2026-10" },
      { professorId: prof, numero: 901, instituicaoId: escola.id, valorCentavos: 60000, referente: "x", dataPagamento: "2026-11-03", referencia: "2026-11" },
    ]);
    await db.insert(schema.pagamentos).values([
      { professorId: prof, alunoId: paga.id, referencia: "2026-11", valorCentavos: 15000, dataPagamento: "2026-11-04", formaPagamento: "Pix" },
    ]);
    // pagamento de outro professor não aparece
    const [terceiro] = await db.insert(schema.professores).values({ nome: "Terceiro", email: "terceiro@x.com", senhaHash: "x" }).returning();
    const [alunoDele] = await db.insert(schema.alunos).values({ professorId: terceiro.id, nome: "Aluno Dele", mensalidadeCentavos: 99900 }).returning();
    await db
      .insert(schema.pagamentos)
      .values({ professorId: terceiro.id, alunoId: alunoDele.id, referencia: "2026-11", valorCentavos: 99900, dataPagamento: "2026-11-04" });

    const [semValor] = await db.insert(schema.instituicoes).values({ professorId: prof, nome: "Projeto Sem Valor" }).returning();
    const { linhas: novembro, fora } = await consultas.financeiroDoMes(prof, "2026-11", "2026-11-12", 10);
    const resumo = novembro.map((l) => [l.pagador.nome, l.situacao, l.pagoCentavos, l.lancamentos.map((x) => x.origem).join("+")]);
    expect(resumo).toEqual([
      ["Deve Ainda", "atrasado", 0, ""],
      ["Escola Fin", "pago", 60000, "recibo"],
      ["Paga Tudo", "pago", 15000, "manual"],
    ]);
    expect(novembro.some((l) => l.pagador.id === daEscola.id && l.pagador.tipo === "aluno")).toBe(false);
    // quem não é cobrado aparece em "fora da cobrança", com o motivo (aluno de instituição não entra)
    expect(fora.filter((f) => ["Projeto Sem Valor", "Da Escola"].includes(f.pagador.nome)).map((f) => [f.pagador.nome, f.motivo])).toEqual([
      ["Projeto Sem Valor", "sem-valor"],
    ]);
    await db.delete(schema.instituicoes).where(eq(schema.instituicoes.id, semValor.id));
    const { linhas: outubro } = await consultas.financeiroDoMes(prof, "2026-10", "2026-11-12", 10);
    expect(outubro.find((l) => l.pagador.nome === "Paga Tudo")).toMatchObject({ situacao: "atrasado", pagoCentavos: 10000, faltaCentavos: 5000 });
    expect((await consultas.financeiroDoMes(terceiro.id, "2026-11", "2026-11-12", 10)).linhas.map((l) => l.pagador.nome)).toEqual(["Aluno Dele"]);
    await db.delete(schema.professores).where(eq(schema.professores.id, terceiro.id));

    await db.delete(schema.instituicoes).where(eq(schema.instituicoes.id, escola.id));
    for (const a of [paga, deve, daEscola]) await db.delete(schema.alunos).where(eq(schema.alunos.id, a.id));
  });
});

describe("vídeos", () => {
  it("acesso por aluno, quem assistiu e módulos na ordem do professor", async () => {
    const db = await getDb();
    const [m2, m1] = await db
      .insert(schema.modulos)
      .values([
        { professorId: prof, nome: "Módulo 2", ordem: 2 },
        { professorId: prof, nome: "Módulo 1", ordem: 1 },
      ])
      .returning();
    const base = { professorId: prof, origem: "youtube" as const, link: "https://youtu.be/dQw4w9WgXcQ", origemId: "dQw4w9WgXcQ" };
    const [todos, soAna, solto] = await db
      .insert(schema.videos)
      .values([
        { ...base, titulo: "Para todos", moduloId: m1.id, ordem: 1 },
        { ...base, titulo: "Só da Ana", moduloId: m2.id, ordem: 1, paraTodos: false },
        { ...base, titulo: "Sem módulo", ordem: 1 },
      ])
      .returning();
    await db.insert(schema.videosAlunos).values({ videoId: soAna.id, alunoId: ana.id });
    const agora = new Date().toISOString();
    await db.insert(schema.visualizacoes).values({ videoId: todos.id, alunoId: ana.id, primeiraVez: agora, ultimaVez: agora, vezes: 3 });
    // vídeo de outro professor não aparece para os alunos deste
    const [terceiro] = await db.insert(schema.professores).values({ nome: "T", email: "t-video@x.com", senhaHash: "x" }).returning();
    await db.insert(schema.videos).values({ ...base, professorId: terceiro.id, titulo: "Do outro" });

    const daAna = await consultas.videosDoAluno(ana);
    expect(daAna.videos.map((v) => [v.titulo, v.visto])).toEqual([
      ["Para todos", true],
      ["Só da Ana", false],
      ["Sem módulo", false],
    ]);
    expect((await consultas.videosDoAluno(bruno)).videos.map((v) => v.titulo)).toEqual(["Para todos", "Sem módulo"]);
    const { agruparPorModulo } = await import("../video");
    expect(agruparPorModulo(daAna.videos, daAna.modulos).map((g) => [g.modulo?.nome ?? "Outros", g.videos.map((v) => v.titulo)])).toEqual([
      ["Módulo 1", ["Para todos"]],
      ["Módulo 2", ["Só da Ana"]],
      ["Outros", ["Sem módulo"]],
    ]);

    const lista = await consultas.listarVideos(prof);
    expect(lista.map((l) => [l.video.titulo, l.vistos, l.publico])).toEqual([
      ["Para todos", 1, 2],
      ["Só da Ana", 0, 1],
      ["Sem módulo", 0, 2],
    ]);
    const detalhe = await consultas.buscarVideo(prof, todos.id);
    expect(detalhe!.assistiu.map((a) => [a.nome, a.visualizacao?.vezes ?? 0])).toEqual([
      ["Ana", 3],
      ["Bruno", 0],
    ]);
    expect(await consultas.buscarVideo(terceiro.id, todos.id)).toBeUndefined();

    // excluir o módulo manda os vídeos para "Outros vídeos"
    await db.delete(schema.modulos).where(eq(schema.modulos.id, m1.id));
    expect((await db.query.videos.findFirst({ where: eq(schema.videos.id, todos.id) }))?.moduloId).toBeNull();

    await db.delete(schema.professores).where(eq(schema.professores.id, terceiro.id));
    for (const v of [todos, soAna, solto]) await db.delete(schema.videos).where(eq(schema.videos.id, v.id));
    await db.delete(schema.modulos).where(eq(schema.modulos.id, m2.id));
  });
});
