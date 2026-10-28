import { afterEach, describe, expect, it } from "vitest";

import { enderecoSite } from "../endereco";

describe("endereço oficial do site", () => {
  afterEach(() => {
    delete process.env.ENDERECO_SITE;
  });
  it("usa a variável, sem barra no final", () => {
    process.env.ENDERECO_SITE = "https://professor.mmoraes.com.br/";
    expect(enderecoSite()).toBe("https://professor.mmoraes.com.br");
  });
  it("sem variável ou com valor inválido, deixa o navegador decidir", () => {
    expect(enderecoSite()).toBeNull();
    process.env.ENDERECO_SITE = "professor.mmoraes.com.br";
    expect(enderecoSite()).toBeNull();
    process.env.ENDERECO_SITE = "https://professor.mmoraes.com.br/aluno";
    expect(enderecoSite()).toBeNull();
  });
});
