import { describe, expect, it } from "vitest";

import { cobradoNoMes, montarFinanceiro, resumoFinanceiro, somarMeses, vencimentoNoMes, type Lancamento, type Pagador } from "../financeiro";

const aluno = (id: number, nome: string, extra: Partial<Pagador> = {}): Pagador => ({
  tipo: "aluno",
  id,
  nome,
  valorCentavos: 15000,
  diaVencimento: null,
  telefone: null,
  ativo: true,
  desde: "2026-01-01",
  ...extra,
});
const pagou = (pagadorId: number, valorCentavos: number, dataPagamento: string, extra: Partial<Lancamento> = {}): Lancamento => ({
  origem: "manual",
  id: pagadorId * 100 + valorCentavos,
  tipo: "aluno",
  pagadorId,
  valorCentavos,
  dataPagamento,
  formaPagamento: "Pix",
  ...extra,
});

describe("vencimento e meses", () => {
  it("dia 31 vira o último dia do mês; navega entre meses", () => {
    expect(vencimentoNoMes("2026-11", 10)).toBe("2026-11-10");
    expect(vencimentoNoMes("2026-02", 31)).toBe("2026-02-28");
    expect(vencimentoNoMes("2028-02", 30)).toBe("2028-02-29");
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
  });
  it("quem é cobrado", () => {
    expect(cobradoNoMes(aluno(1, "A"), "2026-11")).toBe(true);
    expect(cobradoNoMes(aluno(1, "A", { valorCentavos: null }), "2026-11")).toBe(false); // sem mensalidade
    expect(cobradoNoMes(aluno(1, "A", { ativo: false }), "2026-11")).toBe(false);
    expect(cobradoNoMes(aluno(1, "A", { pagoPorInstituicao: true }), "2026-11")).toBe(false);
    expect(cobradoNoMes(aluno(1, "A", { desde: "2026-12-05" }), "2026-11")).toBe(false); // ainda não começou
  });
});

describe("situação do mês", () => {
  const hoje = "2026-11-12";
  const pagadores = [
    aluno(1, "Ana"), // pagou tudo
    aluno(2, "Bruno", { diaVencimento: 5 }), // não pagou, venceu dia 5
    aluno(3, "Carla", { diaVencimento: 20 }), // pagou metade, vence dia 20
    aluno(4, "Diego", { diaVencimento: 20 }), // nada, vence dia 20
    aluno(5, "Elisa", { ativo: false }), // saiu, mas pagou este mês
    aluno(6, "Fábio", { valorCentavos: null }), // isento, nada pago: não aparece
  ];
  const lancamentos = [
    pagou(1, 10000, "2026-11-03"),
    pagou(1, 5000, "2026-11-08", { origem: "recibo", numero: 7 }),
    pagou(3, 7500, "2026-11-10"),
    pagou(5, 15000, "2026-11-02"),
  ];
  const linhas = montarFinanceiro(pagadores, lancamentos, "2026-11", hoje, 10);

  it("classifica e ordena (atrasados primeiro, pagos no fim)", () => {
    expect(linhas.map((l) => [l.pagador.nome, l.situacao, l.faltaCentavos])).toEqual([
      ["Bruno", "atrasado", 15000],
      ["Carla", "parcial", 7500],
      ["Diego", "a-vencer", 15000],
      ["Ana", "pago", 0],
      ["Elisa", "pago", 0],
    ]);
    expect(linhas[0].diasAtraso).toBe(7);
    expect(linhas[0].vencimento).toBe("2026-11-05");
    expect(linhas.find((l) => l.pagador.nome === "Ana")!.lancamentos.map((l) => l.origem)).toEqual(["manual", "recibo"]);
  });

  it("totais do mês", () => {
    expect(resumoFinanceiro(linhas)).toEqual({ previsto: 75000, recebido: 37500, aVencer: 22500, atrasado: 15000 });
  });

  it("parcial que passou do vencimento vira atrasado", () => {
    const depois = montarFinanceiro(pagadores, lancamentos, "2026-11", "2026-11-25", 10);
    expect(depois.find((l) => l.pagador.nome === "Carla")).toMatchObject({ situacao: "atrasado", faltaCentavos: 7500 });
  });

  it("pagou a mais conta como pago, sem valor negativo", () => {
    const [l] = montarFinanceiro([aluno(1, "Ana")], [pagou(1, 20000, "2026-11-01")], "2026-11", hoje, 10);
    expect(l).toMatchObject({ situacao: "pago", faltaCentavos: 0, pagoCentavos: 20000 });
  });
});
