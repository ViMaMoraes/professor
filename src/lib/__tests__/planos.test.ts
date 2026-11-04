import { describe, expect, it } from "vitest";

import { cabeMaisUmAluno, limiteDeAlunos, planoValido, textoLimiteAtingido } from "../planos";

describe("planos", () => {
  it("Iniciante tem limite de 5 alunos ativos; Completo e Anual são ilimitados", () => {
    expect(limiteDeAlunos({ plano: "iniciante", master: false })).toBe(5);
    expect(limiteDeAlunos({ plano: "completo", master: false })).toBeNull();
    expect(limiteDeAlunos({ plano: "anual", master: false })).toBeNull();
  });

  it("o master nunca tem limite, mesmo no Iniciante", () => {
    expect(limiteDeAlunos({ plano: "iniciante", master: true })).toBeNull();
    expect(cabeMaisUmAluno({ plano: "iniciante", master: true }, 50)).toBe(true);
  });

  it("cabe até o 5º aluno e trava no 6º", () => {
    const p = { plano: "iniciante", master: false };
    expect(cabeMaisUmAluno(p, 0)).toBe(true);
    expect(cabeMaisUmAluno(p, 4)).toBe(true);
    expect(cabeMaisUmAluno(p, 5)).toBe(false);
    expect(cabeMaisUmAluno(p, 8)).toBe(false);
  });

  it("plano desconhecido vale como Completo", () => {
    expect(planoValido("ouro")).toBe(false);
    expect(limiteDeAlunos({ plano: "ouro", master: false })).toBeNull();
  });

  it("mensagem cita o plano e o limite", () => {
    expect(textoLimiteAtingido({ plano: "iniciante" }, 5)).toContain("plano Iniciante permite até 5 alunos ativos");
  });
});
