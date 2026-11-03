import { describe, expect, it } from "vitest";

import { agoraBrasilia, aulasParaLembrar, inicioDaSemana, montarAgenda, resumoHorarios, type HorarioAluno } from "../agenda";

const h = (alunoId: number, nome: string, diaSemana: number, hora: string | null, extra: Partial<HorarioAluno> = {}): HorarioAluno => ({
  alunoId,
  nome,
  diaSemana,
  hora,
  duracaoMin: null,
  ...extra,
});

describe("agenda", () => {
  // semana de segunda 09/11/2026 a domingo 15/11/2026
  const horarios = [h(1, "Ana", 1, "18:00"), h(1, "Ana", 3, "18:00"), h(2, "Bruno", 1, "14:00", { duracaoMin: 45 }), h(3, "Carla", 6, null), h(4, "Diego", 2, "10:00", { inicio: "2026-11-12" })];
  const agenda = montarAgenda({
    horarios,
    desmarcadas: [{ id: 9, alunoId: 1, data: "2026-11-11", hora: "18:00", por: "professor", motivo: "feriado" }],
    reposicoes: [{ id: 5, alunoId: 1, nome: "Ana", data: "2026-11-13", hora: "16:00", duracaoMin: null, motivo: null }],
    de: "2026-11-09",
    ate: "2026-11-15",
    duracaoPadrao: 60,
  });

  it("aulas fixas da semana, reposição e desmarcada, em ordem", () => {
    expect(agenda.map((o) => `${o.data} ${o.hora ?? "--:--"} ${o.nome} ${o.tipo}${o.desmarcada ? " desmarcada" : ""} ${o.duracaoMin}`)).toEqual([
      "2026-11-09 14:00 Bruno aula 45",
      "2026-11-09 18:00 Ana aula 60",
      "2026-11-11 18:00 Ana aula desmarcada 60",
      "2026-11-13 16:00 Ana reposicao 60",
      "2026-11-14 --:-- Carla aula 60",
    ]);
    // Diego só começa dia 12: a terça 10/11 não entra
    expect(agenda.some((o) => o.nome === "Diego")).toBe(false);
  });

  it("semana começa na segunda; resumo dos horários", () => {
    expect(inicioDaSemana("2026-11-15")).toBe("2026-11-09");
    expect(inicioDaSemana("2026-11-09")).toBe("2026-11-09");
    expect(resumoHorarios(horarios.filter((x) => x.alunoId === 1).reverse())).toBe("Seg 18:00, Qua 18:00");
    expect(resumoHorarios([h(3, "Carla", 6, null)])).toBe("Sáb (horário a definir)");
  });

  it("horário de Brasília a partir do UTC do servidor", () => {
    expect(agoraBrasilia(new Date("2026-11-10T02:30:00Z"))).toEqual({ data: "2026-11-09", hora: "23:30", minutos: 23 * 60 + 30 });
  });

  it("lembrete sai uma vez, na janela certa, e nunca para aula desmarcada", () => {
    const quando = (data: string, hora: string) => {
      const [hh, mm] = hora.split(":").map(Number);
      return { data, minutos: hh * 60 + mm };
    };
    const nomes = (data: string, hora: string) => aulasParaLembrar(agenda, quando(data, hora), 120).map((o) => `${o.nome} ${o.hora}`);
    expect(nomes("2026-11-09", "11:45")).toEqual([]); // ainda cedo para o Bruno (14:00)
    expect(nomes("2026-11-09", "12:00")).toEqual(["Bruno 14:00"]);
    expect(nomes("2026-11-09", "12:15")).toEqual(["Bruno 14:00"]); // dentro da tolerância (a chave evita repetir)
    expect(nomes("2026-11-09", "12:30")).toEqual([]);
    expect(nomes("2026-11-11", "16:00")).toEqual([]); // desmarcada
    expect(nomes("2026-11-13", "14:00")).toEqual(["Ana 16:00"]); // reposição também avisa
  });

  it("lembrete na virada do dia (aula de manhã cedo, avisada na véspera)", () => {
    const cedo = montarAgenda({ horarios: [h(1, "Ana", 2, "07:00")], desmarcadas: [], reposicoes: [], de: "2026-11-09", ate: "2026-11-10", duracaoPadrao: 60 });
    expect(aulasParaLembrar(cedo, { data: "2026-11-09", minutos: 23 * 60 }, 480).map((o) => o.data)).toEqual(["2026-11-10"]);
  });
});
