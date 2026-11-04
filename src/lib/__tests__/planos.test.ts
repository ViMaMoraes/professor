import { describe, expect, it } from "vitest";

import { cabeMaisUmAluno, limiteDeAlunos, nomeDoPlano, planoValido, textoLimiteAtingido } from "../planos";

describe("planos", () => {
  it("Plus tem limite de 5 alunos ativos; Premium é ilimitado", () => {
    expect(limiteDeAlunos({ plano: "plus", master: false })).toBe(5);
    expect(limiteDeAlunos({ plano: "premium", master: false })).toBeNull();
  });

  it("o master nunca tem limite, mesmo no Plus", () => {
    expect(limiteDeAlunos({ plano: "plus", master: true })).toBeNull();
    expect(cabeMaisUmAluno({ plano: "plus", master: true }, 50)).toBe(true);
  });

  it("cabe até o 5º aluno e trava no 6º", () => {
    const p = { plano: "plus", master: false };
    expect(cabeMaisUmAluno(p, 0)).toBe(true);
    expect(cabeMaisUmAluno(p, 4)).toBe(true);
    expect(cabeMaisUmAluno(p, 5)).toBe(false);
    expect(cabeMaisUmAluno(p, 8)).toBe(false);
  });

  it("plano desconhecido vale como Premium", () => {
    expect(planoValido("completo")).toBe(false);
    expect(planoValido("toString")).toBe(false);
    expect(limiteDeAlunos({ plano: "completo", master: false })).toBeNull();
    expect(nomeDoPlano("completo")).toBe("Premium");
  });

  it("mensagem cita o plano e o limite", () => {
    expect(textoLimiteAtingido({ plano: "plus" }, 5)).toContain("plano Plus permite até 5 alunos ativos");
  });
});
