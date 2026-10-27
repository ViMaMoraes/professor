import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { limparNomeArquivo, montarLote, nomeDoCabecalho } from "../drive-lote";

async function pdfCom(paginas: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage();
  return Buffer.from(await doc.save());
}

const material = (id: number, titulo: string, tipoDrive: "arquivo" | "documento" | "pasta" = "arquivo") => ({
  id,
  titulo,
  tipoDrive,
  driveId: `ID${id}xxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
  link:
    tipoDrive === "documento"
      ? `https://docs.google.com/document/d/ID${id}xxxxxxxxxxxxxxxxxxxxxxxxxxxx/edit`
      : `https://drive.google.com/file/d/ID${id}xxxxxxxxxxxxxxxxxxxxxxxxxxxx/view`,
});

// "Drive" simulado: responde conforme o ID que aparece na URL pedida
let respostas: Record<string, () => Response>;
const driveFalso = (async (url: string | URL | Request) => {
  const texto = String(url);
  const chave = Object.keys(respostas).find((id) => texto.includes(id));
  return chave ? respostas[chave]() : new Response("não encontrado", { status: 404 });
}) as typeof fetch;

beforeAll(async () => {
  const bach = await pdfCom(2);
  const escalas = await pdfCom(3);
  const doc = await pdfCom(1);
  respostas = {
    ID1x: () =>
      new Response(bach, {
        headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename*=UTF-8''Minueto%20em%20Sol.pdf` },
      }),
    ID2x: () => new Response(escalas, { headers: { "content-type": "application/octet-stream" } }), // PDF sem content-type certo
    ID3x: () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } }),
    ID4x: () => new Response("<html>Faça login</html>", { headers: { "content-type": "text/html; charset=utf-8" } }), // não compartilhado
    ID5x: () => new Response(doc, { headers: { "content-type": "application/pdf" } }), // Google Docs exportado
  };
});

describe("montarLote", () => {
  it("ZIP: inclui tudo que baixou e lista o que falhou", async () => {
    const { dados, falhas } = await montarLote(
      [material(1, "Bach"), material(2, "Escalas"), material(3, "Playback"), material(4, "Privado")],
      "zip",
      driveFalso,
    );
    const zip = unzipSync(dados!);
    expect(Object.keys(zip).sort()).toEqual(["Escalas.pdf", "Minueto em Sol.pdf", "Playback.mp3"]);
    expect(falhas).toEqual(["Privado"]);
  });

  it("PDF único: junta as páginas em ordem alfabética e ignora o que não é PDF", async () => {
    const { dados, falhas } = await montarLote(
      [material(2, "Escalas"), material(1, "Bach"), material(3, "Playback"), material(5, "Apostila", "documento")],
      "pdf",
      driveFalso,
    );
    const junto = await PDFDocument.load(dados!);
    expect(junto.getPageCount()).toBe(1 + 2 + 3); // Apostila + Bach + Escalas
    expect(falhas).toEqual(["Playback (não é PDF)"]);
  });

  it("sem nenhum arquivo baixado devolve dados nulos", async () => {
    const { dados, falhas } = await montarLote([material(4, "Privado"), material(9, "Sumiu")], "zip", driveFalso);
    expect(dados).toBeNull();
    expect(falhas).toEqual(["Privado", "Sumiu"]);
  });

  it("não repete nomes dentro do ZIP", async () => {
    const { dados } = await montarLote([material(1, "A"), material(1, "B")], "zip", driveFalso);
    expect(Object.keys(unzipSync(dados!)).sort()).toEqual(["Minueto em Sol (2).pdf", "Minueto em Sol.pdf"]);
  });
});

describe("auxiliares", () => {
  it("lê o nome do arquivo do cabeçalho", () => {
    expect(nomeDoCabecalho(`attachment; filename*=UTF-8''Ave%20Maria.pdf`)).toBe("Ave Maria.pdf");
    expect(nomeDoCabecalho(`attachment; filename="cifra.pdf"`)).toBe("cifra.pdf");
    expect(nomeDoCabecalho(null)).toBeNull();
  });

  it("limpa nomes de arquivo", () => {
    expect(limparNomeArquivo('Culto: 12/10 "manhã"')).toBe("Culto_ 12_10 _manhã_");
    expect(limparNomeArquivo("   ")).toBe("materiais");
  });
});
