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
    return resultado("arquivo", url.searchParams.get("id"));
  }
  return null;
}

/** Endereço para abrir o material no Drive. */
export function urlAbrir(material: { link: string }) {
  return material.link;
}

/** Download direto (só para arquivos; pastas e documentos do Google abrem no Drive). */
export function urlBaixar(material: { link: string; tipoDrive: TipoDrive; driveId: string }) {
  if (material.tipoDrive !== "arquivo") return null;
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", material.driveId);
  // arquivos compartilhados antes de 2021 exigem a resourcekey do link original
  const chave = new URL(material.link).searchParams.get("resourcekey");
  if (chave) url.searchParams.set("resourcekey", chave);
  return url.toString();
}

export const NOME_TIPO_DRIVE: Record<TipoDrive, string> = {
  arquivo: "Arquivo do Drive",
  pasta: "Pasta do Drive",
  documento: "Documento do Google",
};
