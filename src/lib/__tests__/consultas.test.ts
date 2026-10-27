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

  it("usuário do aluno é único no site inteiro", async () => {
    const db = await getDb();
    await db.update(schema.alunos).set({ usuario: "ana.souza" }).where(eq(schema.alunos.id, ana.id));
    expect(await consultas.usuarioEmUso("ana.souza")).toBe(true);
    expect(await consultas.usuarioEmUso("ana.souza", ana.id)).toBe(false);
    expect(await consultas.usuarioEmUso("outro.nome")).toBe(false);
    await db.update(schema.alunos).set({ usuario: null }).where(eq(schema.alunos.id, ana.id));
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
