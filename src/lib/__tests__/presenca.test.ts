import { describe, expect, it } from "vitest";

import { presencaPorMes, resumoPresenca } from "../presenca";

describe("presença do aluno", () => {
  const registros = [
    { data: "2026-10-06", status: "presente" as const },
    { data: "2026-10-13", status: "falta" as const },
    { data: "2026-10-20", status: "justificada" as const },
    { data: "2026-10-27", status: "reposicao" as const },
    { data: "2026-11-03", status: "presente" as const },
  ];

  it("presença e reposição contam como presente; as duas faltas, como ausência", () => {
    expect(resumoPresenca(registros)).toEqual({ presente: 2, reposicao: 1, justificada: 1, falta: 1, total: 5, presentes: 3, frequencia: 60 });
  });

  it("sem chamada, não há frequência", () => {
    expect(resumoPresenca([]).frequencia).toBeNull();
  });

  it("agrupa por mês, do mais recente, cada mês com o seu resumo", () => {
    const meses = presencaPorMes(registros);
    expect(meses.map((m) => m.mes)).toEqual(["2026-11", "2026-10"]);
    expect(meses[1].registros.map((r) => r.data)).toEqual(["2026-10-27", "2026-10-20", "2026-10-13", "2026-10-06"]);
    expect(meses[1].resumo.frequencia).toBe(50);
    expect(meses[0].resumo.frequencia).toBe(100);
  });
});
