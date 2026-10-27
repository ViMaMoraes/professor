import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { contarPorAluno, gerarPlanilhaChamada, type RegistroChamada } from "../planilha-chamada";

const ana = { id: 1, nome: "Ana Souza", instrumento: "Violão" };
const bruno = { id: 2, nome: "Bruno Lima", instrumento: "Guitarra" };
const r = (aluno: typeof ana, data: string, status: RegistroChamada["status"], observacao: string | null = null): RegistroChamada => ({
  aluno,
  data,
  status,
  observacao,
});

const registros = [
  r(bruno, "2026-10-05", "presente"),
  r(ana, "2026-10-05", "presente", "Escala de Dó"),
  r(bruno, "2026-10-12", "falta", "Avisou que estava doente"),
  r(ana, "2026-10-12", "reposicao"),
  r(bruno, "2026-10-19", "justificada"),
];

describe("planilha de chamada", () => {
  it("conta presenças e frequência por aluno (reposição conta como presença)", () => {
    const resumo = contarPorAluno(registros);
    expect(resumo.map((x) => x.aluno.nome)).toEqual(["Ana Souza", "Bruno Lima"]);
    expect(resumo[0]).toMatchObject({ aulas: 2, frequencia: 1 });
    expect(resumo[1].total).toEqual({ presente: 1, falta: 1, justificada: 1, reposicao: 0 });
    expect(resumo[1].frequencia).toBeCloseTo(1 / 3);
  });

  it("gera um .xlsx com as três abas e os dados", async () => {
    const arquivo = await gerarPlanilhaChamada(registros, { inicio: "2026-10-01", fim: "2026-10-31" });
    const zip = unzipSync(arquivo);
    const workbook = strFromU8(zip["xl/workbook.xml"]);
    expect(workbook).toContain('name="Chamada"');
    expect(workbook).toContain('name="Resumo"');
    expect(workbook).toContain('name="Registros"');
    const textos = strFromU8(zip["xl/sharedStrings.xml"]);
    for (const esperado of ["Ana Souza", "Bruno Lima", "Avisou que estava doente", "Chamada · 01/10/2026 a 31/10/2026", "Falta justificada"]) {
      expect(textos).toContain(esperado);
    }
  });

  it("funciona sem registros no período", async () => {
    const arquivo = await gerarPlanilhaChamada([], { inicio: "2026-10-01", fim: "2026-10-31" });
    expect(Object.keys(unzipSync(arquivo))).toContain("xl/workbook.xml");
  });
});
