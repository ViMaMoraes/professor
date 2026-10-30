import { describe, expect, it } from "vitest";

import { erroDocumento, erroTelefone, mascaraDocumento, mascaraRg, mascaraTelefone } from "../mascaras";

describe("máscaras", () => {
  it("CPF e CNPJ, enquanto digita e já completos", () => {
    expect(mascaraDocumento("4651014887")).toBe("465.101.488-7");
    expect(mascaraDocumento("46510148870")).toBe("465.101.488-70");
    expect(mascaraDocumento("465.101.488-70")).toBe("465.101.488-70");
    expect(mascaraDocumento("12345678000190")).toBe("12.345.678/0001-90");
    expect(mascaraDocumento("465")).toBe("465");
    expect(mascaraDocumento("")).toBe("");
  });
  it("telefone fixo e celular, com ou sem +55", () => {
    expect(mascaraTelefone("11999990000")).toBe("(11) 99999-0000");
    expect(mascaraTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(mascaraTelefone("+55 11 99999-0000")).toBe("(11) 99999-0000");
    expect(mascaraTelefone("119")).toBe("(11) 9");
    expect(mascaraTelefone("1")).toBe("(1");
  });
  it("RG de SP e de outros estados", () => {
    expect(mascaraRg("394737234")).toBe("39.473.723-4");
    expect(mascaraRg("39473723x")).toBe("39.473.723-X");
    expect(mascaraRg("39.473.723-4")).toBe("39.473.723-4");
    expect(mascaraRg("3947")).toBe("39.47");
    expect(mascaraRg("MG-12.345.678")).toBe("MG-12.345.678"); // outro formato: fica como digitado
    expect(mascaraRg("1234567890")).toBe("1234567890");
  });
  it("confere os dígitos do CPF/CNPJ e o tamanho do telefone", () => {
    expect(erroDocumento("465.101.488-70")).toBeNull();
    expect(erroDocumento("465.101.488-71")).toMatch(/inválido/);
    expect(erroDocumento("111.111.111-11")).toMatch(/inválido/);
    expect(erroDocumento("465.101.488")).toMatch(/incompleto/);
    expect(erroDocumento("11.222.333/0001-81")).toBeNull();
    expect(erroDocumento("11.222.333/0001-82")).toMatch(/inválido/);
    expect(erroDocumento("")).toBeNull();
    expect(erroTelefone("(11) 99999-0000")).toBeNull();
    expect(erroTelefone("(11) 9999")).toMatch(/incompleto/);
  });
});
