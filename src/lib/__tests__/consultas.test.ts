import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

// banco isolado numa pasta temporária (precisa vir antes de importar o módulo do banco)
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "professor-teste-"));

const { getDb, schema } = await import("../db");
const { alunoPodeBaixar, frequenciaDoAluno, materiaisDoAluno, recebidoPorMes } = await import("../consultas");

let ana: number;
let bruno: number;
let soDaAna: number;
let paraTodos: number;

beforeAll(async () => {
  const db = await getDb();
  [{ id: ana }, { id: bruno }] = await db
    .insert(schema.alunos)
    .values([{ nome: "Ana" }, { nome: "Bruno" }])
    .returning({ id: schema.alunos.id });
  const base = { arquivo: "x.pdf", nomeOriginal: "x.pdf", tamanho: 1 };
  [{ id: soDaAna }, { id: paraTodos }] = await db
    .insert(schema.materiais)
    .values([
      { ...base, titulo: "Só da Ana" },
      { ...base, titulo: "Para todos", paraTodos: true },
    ])
    .returning({ id: schema.materiais.id });
  await db.insert(schema.materiaisAlunos).values({ materialId: soDaAna, alunoId: ana });
});

describe("permissões da central de downloads", () => {
  it("cada aluno vê só o que foi liberado para ele", async () => {
    expect((await materiaisDoAluno(ana)).map((m) => m.titulo).sort()).toEqual(["Para todos", "Só da Ana"]);
    expect((await materiaisDoAluno(bruno)).map((m) => m.titulo)).toEqual(["Para todos"]);
    expect(await alunoPodeBaixar(soDaAna, bruno)).toBe(false);
    expect(await alunoPodeBaixar(soDaAna, ana)).toBe(true);
    expect(await alunoPodeBaixar(paraTodos, bruno)).toBe(true);
  });
});

describe("chamada e recibos", () => {
  it("frequência conta presença e reposição", async () => {
    const db = await getDb();
    await db.insert(schema.presencas).values([
      { alunoId: bruno, data: "2026-10-05", status: "presente" },
      { alunoId: bruno, data: "2026-10-12", status: "falta" },
      { alunoId: bruno, data: "2026-10-19", status: "reposicao" },
      { alunoId: bruno, data: "2026-10-26", status: "justificada" },
    ]);
    expect(await frequenciaDoAluno(bruno)).toBe(50);
    expect(await frequenciaDoAluno(ana)).toBeNull();
  });

  it("excluir o aluno apaga chamadas e recibos (cascata)", async () => {
    const db = await getDb();
    await db.insert(schema.recibos).values({ numero: 1, alunoId: bruno, valorCentavos: 100, referente: "x", dataPagamento: "2026-10-01" });
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.alunos).where(eq(schema.alunos.id, bruno));
    expect(await db.select().from(schema.presencas).where(eq(schema.presencas.alunoId, bruno))).toEqual([]);
    expect(await db.select().from(schema.recibos).where(eq(schema.recibos.alunoId, bruno))).toEqual([]);
  });

  it("soma recebimentos por mês, incluindo meses vazios", async () => {
    const db = await getDb();
    await db.insert(schema.recibos).values([
      { numero: 10, alunoId: ana, valorCentavos: 15000, referente: "x", dataPagamento: "2026-08-05" },
      { numero: 11, alunoId: ana, valorCentavos: 15000, referente: "x", dataPagamento: "2026-10-05" },
      { numero: 12, alunoId: ana, valorCentavos: 5000, referente: "x", dataPagamento: "2026-10-20" },
    ]);
    expect(await recebidoPorMes("2026-10-27", 3)).toEqual([
      { mes: "2026-08", total: 15000 },
      { mes: "2026-09", total: 0 },
      { mes: "2026-10", total: 20000 },
    ]);
  });
});
