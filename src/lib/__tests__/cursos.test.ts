import { describe, expect, it } from "vitest";

import { lerCursosDoFormulario, resumoDosCursos } from "../cursos";

const form = (pares: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of pares) f.append(k, v);
  return f;
};

describe("cursos do aluno (estúdio)", () => {
  it("lê cada curso com o professor e os horários de cada um", () => {
    const { cursos, horarios } = lerCursosDoFormulario(
      form([
        ["cursoChave", "c0"],
        ["cursoId", "7"],
        ["cursoNome", "  Piano  clássico "],
        ["cursoMembro", "3"],
        ["horarioCurso", "c0"],
        ["horarioDia", "1"],
        ["horarioHora", "18:00"],
        ["horarioDuracao", "60"],
        ["cursoChave", "c1"],
        ["cursoId", ""],
        ["cursoNome", "Teoria"],
        ["cursoMembro", "0"],
        ["horarioCurso", "c1"],
        ["horarioDia", "3"],
        ["horarioHora", "25:00"],
        ["horarioDuracao", "33"],
        ["horarioCurso", "c9"],
        ["horarioDia", "5"],
        ["horarioHora", "10:00"],
        ["horarioDuracao", ""],
      ]),
    );
    expect(cursos).toEqual([
      { chave: "c0", id: 7, nome: "Piano clássico", membroId: 3 },
      { chave: "c1", id: null, nome: "Teoria", membroId: null },
    ]);
    // hora e duração inválidas viram vazias; horário de curso que não veio é ignorado
    expect(horarios).toEqual([
      { diaSemana: 1, hora: "18:00", duracaoMin: 60, cursoChave: "c0" },
      { diaSemana: 3, hora: null, duracaoMin: null, cursoChave: "c1" },
    ]);
  });

  it("resume os nomes sem repetir", () => {
    expect(resumoDosCursos(["Piano", "Teoria", "Piano", ""])).toBe("Piano, Teoria");
    expect(resumoDosCursos([])).toBeNull();
  });
});
