import { describe, expect, it } from "vitest";

import { valorPorExtenso, numeroPorExtenso } from "../extenso";
import { centavosParaCampo, dataBR, dataPorExtenso, isoValido, lerValorEmCentavos, moeda, somarDias, tamanhoArquivo } from "../formato";
import { linkWhatsapp } from "../mensagens";

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
  it("tamanho de arquivo", () => {
    expect(tamanhoArquivo(500)).toBe("500 B");
    expect(tamanhoArquivo(1536)).toBe("1,5 KB");
    expect(tamanhoArquivo(5 * 1024 * 1024)).toBe("5,0 MB");
  });

  it("link do WhatsApp com DDI do Brasil", () => {
    expect(linkWhatsapp("(11) 98888-0001", "oi")).toBe("https://wa.me/5511988880001?text=oi");
    expect(linkWhatsapp(null, "oi")).toBe("https://wa.me/?text=oi");
  });
});
