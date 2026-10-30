import { describe, expect, it } from "vitest";

import { valorPorExtenso, numeroPorExtenso } from "../extenso";
import { centavosParaCampo, dataBR, dataPorExtenso, isoValido, lerValorEmCentavos, moeda, somarDias } from "../formato";
import { linkWhatsapp } from "../mensagens";
import { pagadorDoRecibo, referenteA } from "../pagador";
import { linhaDataRecibo, textoRecibo } from "../recibo-pdf";
import { normalizarUsuario, sugerirUsuario } from "../usuario";

describe("valores", () => {
  it("lê valores digitados em reais", () => {
    expect(lerValorEmCentavos("1.250,50")).toBe(125050);
    expect(lerValorEmCentavos("150")).toBe(15000);
    expect(lerValorEmCentavos("R$ 99,9")).toBe(9990);
    expect(lerValorEmCentavos("1250.5")).toBe(125050);
    expect(lerValorEmCentavos("-5")).toBeNull();
    expect(lerValorEmCentavos("abc")).toBeNull();
    expect(lerValorEmCentavos("")).toBeNull();
  });

  it("formata moeda e campos", () => {
    expect(moeda(125050)).toBe("R$ 1.250,50");
    expect(moeda(null)).toBe("—");
    expect(centavosParaCampo(18000)).toBe("180,00");
  });
});

describe("por extenso", () => {
  it.each([
    [0, "zero"],
    [1, "um"],
    [16, "dezesseis"],
    [21, "vinte e um"],
    [100, "cem"],
    [101, "cento e um"],
    [250, "duzentos e cinquenta"],
    [1000, "mil"],
    [1020, "mil e vinte"],
    [1100, "mil e cem"],
    [1250, "mil duzentos e cinquenta"],
    [2000, "dois mil"],
    [21345, "vinte e um mil trezentos e quarenta e cinco"],
    [1_000_000, "um milhão"],
  ])("%i → %s", (n, esperado) => {
    expect(numeroPorExtenso(n)).toBe(esperado);
  });

  it("escreve valores em reais", () => {
    expect(valorPorExtenso(18000)).toBe("cento e oitenta reais");
    expect(valorPorExtenso(125050)).toBe("mil duzentos e cinquenta reais e cinquenta centavos");
    expect(valorPorExtenso(100)).toBe("um real");
    expect(valorPorExtenso(1)).toBe("um centavo");
    expect(valorPorExtenso(100_000_000)).toBe("um milhão de reais");
  });
});

describe("datas", () => {
  it("formata e valida", () => {
    expect(dataBR("2026-10-05")).toBe("05/10/2026");
    expect(dataPorExtenso("2026-10-05")).toBe("5 de outubro de 2026");
    expect(isoValido("2026-02-30")).toBe(true); // o Date corrige; o input type=date não deixa chegar aqui
    expect(isoValido("05/10/2026")).toBe(false);
    expect(somarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("outros", () => {
  it("link do WhatsApp com DDI do Brasil", () => {
    expect(linkWhatsapp("(11) 98888-0001", "oi")).toBe("https://wa.me/5511988880001?text=oi");
    expect(linkWhatsapp(null, "oi")).toBe("https://wa.me/?text=oi");
  });
});

describe("pagador do recibo", () => {
  const aluno = { nome: "Carla", responsavel: null, telefone: "1", email: null };
  it("aluno, responsável ou instituição", () => {
    expect(pagadorDoRecibo(aluno, null).recebiDe).toBe("de Carla");
    expect(pagadorDoRecibo({ ...aluno, responsavel: "Marina" }, null).recebiDe).toBe("de Marina, responsável por Carla,");
    const escola = { nome: "Escola X", documento: "12.345.678/0001-90", telefone: "2", email: "e@x.com" };
    expect(pagadorDoRecibo(null, escola)).toEqual({
      tipo: "instituicao",
      nome: "Escola X",
      recebiDe: "de Escola X (CNPJ 12.345.678/0001-90)",
      descricao: null,
      telefone: "2",
      email: "e@x.com",
    });
    const igreja = { nome: "Igreja Assembleia de Deus", documento: null, telefone: null, email: null, tratamento: "da", descricaoRecibo: "às aulas de violino" };
    expect(pagadorDoRecibo(null, igreja)).toMatchObject({ recebiDe: "da Igreja Assembleia de Deus", descricao: "às aulas de violino" });
  });

  it("referente a / referente às", () => {
    expect(referenteA("às aulas de violino")).toBe("referente às aulas de violino");
    expect(referenteA("aulas de violino")).toBe("referente a aulas de violino");
    expect(referenteA("ao curso de inglês")).toBe("referente ao curso de inglês");
  });
});

describe("texto do recibo", () => {
  const professor = {
    nome: "Marcus Vinicius de Moraes",
    documento: "465.101.488-70",
    rg: "39.473.723-4",
    endereco: "Rua Augusto Godofredo Kleber, 113 Pq. Residencial Rondon",
    cidade: "Salto/SP",
    assinatura: null,
  };
  const recibo = {
    id: 1,
    professorId: 1,
    numero: 1,
    alunoId: null,
    instituicaoId: 1,
    valorCentavos: 80000,
    referente: "às aulas de violino",
    formaPagamento: "Pix",
    dataPagamento: "2026-03-10",
    observacoes: null,
    criadoEm: "2026-03-10",
  };
  it("segue o modelo, sem nomes de alunos", () => {
    expect(textoRecibo(recibo, { recebiDe: "da Igreja Assembleia de Deus" }, professor)).toBe(
      "Eu, Marcus Vinicius de Moraes, CPF: 465.101.488-70, RG: 39.473.723-4, residente na Rua Augusto Godofredo Kleber, 113 " +
        "Pq. Residencial Rondon - Salto/SP, recebi da Igreja Assembleia de Deus a quantia de R$ 800,00 (oitocentos reais) " +
        "referente às aulas de violino.",
    );
    expect(textoRecibo(recibo, { recebiDe: "de Ana" }, { ...professor, documento: null, rg: null, endereco: null })).toBe(
      "Eu, Marcus Vinicius de Moraes, recebi de Ana a quantia de R$ 800,00 (oitocentos reais) referente às aulas de violino.",
    );
  });
  it("CPF, RG e CNPJ cadastrados sem pontuação saem formatados", () => {
    const semPontos = { ...professor, documento: "46510148870", rg: "394737234" };
    expect(textoRecibo(recibo, { recebiDe: "de Ana" }, semPontos)).toContain("CPF: 465.101.488-70, RG: 39.473.723-4,");
    const escola = { nome: "Escola X", documento: "12345678000190", telefone: null, email: null };
    expect(pagadorDoRecibo(null, escola).recebiDe).toBe("de Escola X (CNPJ 12.345.678/0001-90)");
    expect(pagadorDoRecibo(null, { ...escola, documento: "46510148870" }).recebiDe).toBe("de Escola X (CPF 465.101.488-70)");
  });
  it("local e data", () => {
    expect(linhaDataRecibo("2026-03-10", "Salto/SP")).toBe("Salto, 10 de Março de 2026.");
    expect(linhaDataRecibo("2026-03-10", null)).toBe("10 de Março de 2026.");
  });
});

describe("usuário do aluno", () => {
  it("sugere nome.sobrenome sem acentos nem preposições", () => {
    expect(sugerirUsuario("Ana Souza")).toBe("ana.souza");
    expect(sugerirUsuario("João da Silva Araújo")).toBe("joao.araujo");
    expect(sugerirUsuario("Lia")).toBe("lia");
  });
  it("normaliza o que foi digitado", () => {
    expect(normalizarUsuario("  Ana Souza ")).toBe("ana.souza");
    expect(normalizarUsuario("JOÃO#1")).toBe("joao1");
  });
});
