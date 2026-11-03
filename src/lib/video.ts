import { lerLinkDrive } from "./drive";

/** Link de vídeo reconhecido: arquivo do Google Drive ou vídeo do YouTube. */
export type LinkVideo = { origem: "drive" | "youtube"; id: string; link: string };

const ID_YOUTUBE = /^[\w-]{11}$/;

function lerYoutube(texto: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const partes = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined = null;
  if (host === "youtu.be") id = partes[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (partes[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "live", "embed", "v"].includes(partes[0])) id = partes[1];
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

export function lerLinkVideo(texto: string | null | undefined): LinkVideo | null {
  const limpo = texto?.trim();
  if (!limpo) return null;
  const youtube = lerYoutube(limpo);
  if (youtube) return { origem: "youtube", id: youtube, link: limpo };
  const drive = lerLinkDrive(limpo);
  // do Drive, só arquivo (pasta e documento não tocam como vídeo)
  return drive?.tipo === "arquivo" ? { origem: "drive", id: drive.id, link: drive.link } : null;
}

type VideoSalvo = { origem: "drive" | "youtube"; origemId: string; link: string };

/** Endereço do player para o iframe (sem vídeos sugeridos no fim, no YouTube). */
export function urlPlayer(v: VideoSalvo) {
  if (v.origem === "youtube") return `https://www.youtube-nocookie.com/embed/${v.origemId}?rel=0&modestbranding=1&playsinline=1`;
  const url = new URL(`https://drive.google.com/file/d/${v.origemId}/preview`);
  // arquivos compartilhados antes de 2021 exigem a resourcekey do link original
  try {
    const chave = new URL(v.link).searchParams.get("resourcekey");
    if (chave) url.searchParams.set("resourcekey", chave);
  } catch {
    // link sem formato de URL: segue sem a chave
  }
  return url.toString();
}

/** Capa automática (miniatura) do vídeo. */
export function urlCapa(v: VideoSalvo) {
  return v.origem === "youtube" ? `https://i.ytimg.com/vi/${v.origemId}/hqdefault.jpg` : `https://drive.google.com/thumbnail?id=${v.origemId}&sz=w640`;
}

/** Agrupa os vídeos nos módulos (na ordem do professor) e, no fim, "Outros vídeos" (sem módulo). */
export function agruparPorModulo<V extends { moduloId: number | null; ordem: number; id: number }, M extends { id: number }>(
  lista: V[],
  modulos: M[],
  { incluirVazios = false } = {},
) {
  const porModulo = Map.groupBy(lista, (v) => (modulos.some((m) => m.id === v.moduloId) ? v.moduloId : null));
  const ordenar = (vs: V[]) => [...vs].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  const grupos = modulos
    .map((m) => ({ modulo: m as M | null, videos: ordenar(porModulo.get(m.id) ?? []) }))
    .filter((g) => incluirVazios || g.videos.length > 0);
  const soltos = porModulo.get(null) ?? [];
  if (soltos.length) grupos.push({ modulo: null, videos: ordenar(soltos) });
  return grupos;
}
