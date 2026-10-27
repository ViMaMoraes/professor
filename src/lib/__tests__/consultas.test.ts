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
