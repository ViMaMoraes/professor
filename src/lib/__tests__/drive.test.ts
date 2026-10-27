import { describe, expect, it } from "vitest";

import { lerLinkDrive, podeBaixarEmLote, urlBaixar, urlConteudo, urlVer } from "../drive";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-123";

describe("lerLinkDrive", () => {
  it.each([
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, "arquivo"],
    [`https://drive.google.com/file/d/${ID}/view?usp=drive_link`, "arquivo"],
    [`https://drive.google.com/file/u/1/d/${ID}/view`, "arquivo"],
    [`https://drive.google.com/open?id=${ID}`, "arquivo"],
    [`https://drive.google.com/uc?id=${ID}&export=download`, "arquivo"],
    [`drive.google.com/file/d/${ID}/view`, "arquivo"],
    [`  https://drive.google.com/file/d/${ID}/view  `, "arquivo"],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, "pasta"],
    [`https://drive.google.com/drive/u/0/folders/${ID}`, "pasta"],
    [`https://docs.google.com/document/d/${ID}/edit?usp=sharing`, "documento"],
    [`https://docs.google.com/spreadsheets/d/${ID}/edit`, "documento"],
    [`https://docs.google.com/presentation/d/${ID}/edit`, "documento"],
    // formato desconhecido: acha o ID longo no caminho (como no sistema de partituras)
    [`https://drive.google.com/a/escola.com/${ID}/qualquer-coisa`, "arquivo"],
  ])("%s → %s", (link, tipo) => {
    expect(lerLinkDrive(link)).toMatchObject({ tipo, id: ID });
  });

  it.each([
    "",
    "não é link",
    `https://example.com/file/d/${ID}/view`,
    `https://drive.google.com.golpe.com/file/d/${ID}/view`,
    "https://drive.google.com/file/d/curto/view",
    "https://drive.google.com/drive/my-drive",
    "javascript:alert(1)",
  ])("rejeita %s", (link) => {
    expect(lerLinkDrive(link)).toBeNull();
  });
});

describe("urlBaixar", () => {
  it("gera download direto só para arquivos, mantendo a resourcekey", () => {
    const link = `https://drive.google.com/file/d/${ID}/view?resourcekey=0-abc`;
    expect(urlBaixar({ link, tipoDrive: "arquivo", driveId: ID })).toBe(
      `https://drive.google.com/uc?export=download&id=${ID}&resourcekey=0-abc`,
    );
    expect(urlBaixar({ link, tipoDrive: "pasta", driveId: ID })).toBeNull();
  });
});

describe("visualização e download pelo servidor", () => {
  const arquivo = { link: `https://drive.google.com/file/d/${ID}/view`, tipoDrive: "arquivo" as const, driveId: ID };
  const pasta = { link: `https://drive.google.com/drive/folders/${ID}`, tipoDrive: "pasta" as const, driveId: ID };
  const planilha = { link: `https://docs.google.com/spreadsheets/d/${ID}/edit`, tipoDrive: "documento" as const, driveId: ID };
  const formulario = { link: `https://docs.google.com/forms/d/${ID}/edit`, tipoDrive: "documento" as const, driveId: ID };

  it("monta a visualização para o iframe", () => {
    expect(urlVer(arquivo)).toBe(`https://drive.google.com/file/d/${ID}/preview`);
    expect(urlVer(pasta)).toBe(`https://drive.google.com/embeddedfolderview?id=${ID}#list`);
    expect(urlVer(planilha)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/preview`);
  });

  it("monta o endereço de conteúdo usado no ZIP/PDF", () => {
    expect(urlConteudo(arquivo)).toBe(`https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t`);
    expect(urlConteudo(planilha)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=pdf`);
    expect(urlBaixar(planilha)).toBe(urlConteudo(planilha));
    expect(podeBaixarEmLote(pasta)).toBe(false);
    expect(podeBaixarEmLote(formulario)).toBe(false);
  });
});
