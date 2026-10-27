import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

import type { TipoDrive } from "./db/schema";
import { urlConteudo } from "./drive";

export type FormatoLote = "zip" | "pdf";

type MaterialLote = { id: number; titulo: string; link: string; tipoDrive: TipoDrive; driveId: string };

type Baixado = { material: MaterialLote; nome: string; dados: Uint8Array; ehPdf: boolean };

export type ResultadoLote = { dados: Uint8Array | null; falhas: string[] };

const SIMULTANEOS = 4;
const TIMEOUT_MS = 60_000;

/** Tira caracteres que não podem aparecer em nome de arquivo. */
export function limparNomeArquivo(nome: string, padrao = "materiais") {
  return nome.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 120) || padrao;
}

/** Lê o nome do arquivo do cabeçalho Content-Disposition que o Drive devolve. */
export function nomeDoCabecalho(cabecalho: string | null) {
  if (!cabecalho) return null;
  const utf8 = cabecalho.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      // segue para o filename simples
    }
  }
  return cabecalho.match(/filename="?([^";]+)"?/i)?.[1].trim() ?? null;
}

const EXTENSOES: Record<string, string> = {
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
};

async function baixarUm(material: MaterialLote, buscar: typeof fetch): Promise<Baixado> {
  const url = urlConteudo(material);
  if (!url) throw new Error("tipo sem download");
  const resposta = await buscar(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const tipo = resposta.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  // Arquivo não compartilhado como "qualquer pessoa com o link" volta como página HTML de login
  if (!resposta.ok || tipo === "text/html") throw new Error("sem acesso");

  const dados = new Uint8Array(await resposta.arrayBuffer());
  const ehPdf = tipo === "application/pdf" || new TextDecoder().decode(dados.slice(0, 5)) === "%PDF-";
  const extensao = ehPdf ? "pdf" : (EXTENSOES[tipo] ?? "");
  const nome =
    nomeDoCabecalho(resposta.headers.get("content-disposition")) ??
    `${limparNomeArquivo(material.titulo, "material")}${extensao ? "." + extensao : ""}`;
  return { material, nome: limparNomeArquivo(nome, "material"), dados, ehPdf };
}

/** Executa `tarefa` para cada item com no máximo `limite` ao mesmo tempo, mantendo a ordem. */
async function emParalelo<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>) {
  const resultados: PromiseSettledResult<R>[] = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await tarefa(itens[i]).then(
        (value) => ({ status: "fulfilled", value }) as const,
        (reason) => ({ status: "rejected", reason }) as const,
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

/**
 * Busca os materiais no Drive e junta tudo num ZIP (arquivos separados) ou num PDF único
 * (na ordem alfabética dos títulos). `falhas` lista os títulos que não puderam entrar.
 */
export async function montarLote(
  materiais: MaterialLote[],
  formato: FormatoLote,
  buscar: typeof fetch = fetch,
): Promise<ResultadoLote> {
  const ordenados = [...materiais].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  const resultados = await emParalelo(ordenados, SIMULTANEOS, (m) => baixarUm(m, buscar));

  const falhas: string[] = [];
  const baixados: Baixado[] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") baixados.push(r.value);
    else falhas.push(ordenados[i].titulo);
  });

  if (formato === "zip") {
    if (baixados.length === 0) return { dados: null, falhas };
    const arquivos: Record<string, Uint8Array> = {};
    for (const b of baixados) {
      // evita nomes repetidos dentro do ZIP: "escala.pdf", "escala (2).pdf"...
      let nome = b.nome;
      for (let n = 2; nome in arquivos; n++) nome = b.nome.replace(/(\.[^.]+)?$/, ` (${n})$1`);
      arquivos[nome] = b.dados;
    }
    return { dados: zipSync(arquivos, { level: 0 }), falhas }; // PDFs/áudios já são comprimidos
  }

  const pdf = await PDFDocument.create();
  let paginas = 0;
  for (const b of baixados) {
    if (!b.ehPdf) {
      falhas.push(`${b.material.titulo} (não é PDF)`);
      continue;
    }
    try {
      const origem = await PDFDocument.load(b.dados, { ignoreEncryption: true });
      for (const pagina of await pdf.copyPages(origem, origem.getPageIndices())) {
        pdf.addPage(pagina);
        paginas++;
      }
    } catch {
      falhas.push(`${b.material.titulo} (PDF inválido)`);
    }
  }
  return { dados: paginas ? await pdf.save() : null, falhas };
}
