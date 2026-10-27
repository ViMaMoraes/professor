import type { TipoDrive } from "./db/schema";

export type LinkDrive = { tipo: TipoDrive; id: string; link: string };

const ID = /^[\w-]{10,}$/;

/**
 * Reconhece links de compartilhamento do Google Drive/Docs:
 * - drive.google.com/file/d/ID/view, /open?id=ID, /uc?id=ID  → arquivo
 * - drive.google.com/drive/folders/ID (inclusive /drive/u/0/folders/ID) → pasta
 * - docs.google.com/document|spreadsheets|presentation|forms/d/ID → documento
 * Retorna null se não for um link do Drive.
 */
export function lerLinkDrive(texto: string | null | undefined): LinkDrive | null {
  if (!texto) return null;
  let url: URL;
  try {
    const limpo = texto.trim();
    url = new URL(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const partes = url.pathname.split("/").filter(Boolean);
  const depoisDe = (marcador: string) => {
    const i = partes.indexOf(marcador);
    return i >= 0 ? partes[i + 1] : undefined;
  };
  const resultado = (tipo: TipoDrive, id: string | null | undefined): LinkDrive | null =>
    id && ID.test(id) ? { tipo, id, link: url.toString() } : null;

  if (host === "docs.google.com") {
    if (["document", "spreadsheets", "presentation", "forms"].includes(partes[0])) {
      return resultado("documento", depoisDe("d"));
    }
    return null;
  }
  if (host === "drive.google.com") {
    if (partes.includes("folders")) return resultado("pasta", depoisDe("folders"));
    if (partes[0] === "file") return resultado("arquivo", depoisDe("d"));
    const porId = resultado("arquivo", url.searchParams.get("id"));
    if (porId) return porId;
    // formato desconhecido: como no sistema de partituras, procura um ID longo em qualquer parte do link
    return resultado("arquivo", url.pathname.match(/[\w-]{25,}/)?.[0]);
  }
  return null;
}

type MaterialDrive = { link: string; tipoDrive: TipoDrive; driveId: string };

/** "document", "spreadsheets", "presentation" ou "forms" (só para documentos do Google). */
function tipoDocumento(link: string) {
  return new URL(link).pathname.split("/").filter(Boolean)[0];
}

function comResourcekey(url: URL, linkOriginal: string) {
  // arquivos compartilhados antes de 2021 exigem a resourcekey do link original
  const chave = new URL(linkOriginal).searchParams.get("resourcekey");
  if (chave) url.searchParams.set("resourcekey", chave);
  return url.toString();
}

/** Visualização para abrir dentro do site (iframe). */
export function urlVer(material: MaterialDrive) {
  const id = material.driveId;
  if (material.tipoDrive === "pasta") {
    return comResourcekey(new URL(`https://drive.google.com/embeddedfolderview?id=${id}#list`), material.link);
  }
  if (material.tipoDrive === "documento") {
    return `https://docs.google.com/${tipoDocumento(material.link)}/d/${id}/preview`;
  }
  return comResourcekey(new URL(`https://drive.google.com/file/d/${id}/preview`), material.link);
}

/**
 * Endereço que o servidor usa para buscar o conteúdo do material (download em lote).
 * Documentos do Google são exportados em PDF; pastas e formulários não têm download.
 */
export function urlConteudo(material: MaterialDrive) {
  const id = material.driveId;
  if (material.tipoDrive === "arquivo") {
    const url = new URL("https://drive.usercontent.google.com/download");
    url.searchParams.set("id", id);
    url.searchParams.set("export", "download");
    url.searchParams.set("confirm", "t"); // pula o aviso de "arquivo grande demais para verificar vírus"
    return comResourcekey(url, material.link);
  }
  if (material.tipoDrive === "documento") {
    const tipo = tipoDocumento(material.link);
    if (tipo === "forms") return null;
    return `https://docs.google.com/${tipo}/d/${id}/export?format=pdf`;
  }
  return null;
}

/** Endereço para abrir o material no Drive. */
export function urlAbrir(material: { link: string }) {
  return material.link;
}

/** Download direto pelo navegador: arquivos baixam; documentos do Google baixam em PDF; pastas não. */
export function urlBaixar(material: MaterialDrive) {
  if (material.tipoDrive === "documento") return urlConteudo(material);
  if (material.tipoDrive !== "arquivo") return null;
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", material.driveId);
  return comResourcekey(url, material.link);
}

/** Dá para incluir no download em lote (ZIP / PDF único)? */
export function podeBaixarEmLote(material: MaterialDrive) {
  return urlConteudo(material) !== null;
}

export const NOME_TIPO_DRIVE: Record<TipoDrive, string> = {
  arquivo: "Arquivo do Drive",
  pasta: "Pasta do Drive",
  documento: "Documento do Google",
};
