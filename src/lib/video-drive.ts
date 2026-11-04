import "server-only";

/**
 * Vídeo do Drive tocado pelo player do próprio site: o site busca o arquivo na API do Google Drive
 * (com a chave GOOGLE_API_KEY) e repassa para o navegador, inclusive os pedidos de "trecho" (Range),
 * que permitem avançar e voltar. Funciona com arquivos compartilhados como "Qualquer pessoa com o link".
 */
export function chaveGoogle() {
  return process.env.GOOGLE_API_KEY?.trim() || null;
}

/** Cabeçalhos que passam do Drive para o navegador. */
const REPASSAR = ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"];

export async function buscarVideoDrive(video: { origemId: string; link: string }, pedido: Request, chave: string) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(video.origemId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("key", chave);
  const cabecalhos = new Headers();
  const trecho = pedido.headers.get("range");
  if (trecho) cabecalhos.set("range", trecho);
  // arquivos compartilhados antes de 2021 exigem a resourcekey do link original
  try {
    const recurso = new URL(video.link).searchParams.get("resourcekey");
    if (recurso) cabecalhos.set("x-goog-drive-resource-keys", `${video.origemId}/${recurso}`);
  } catch {
    // link sem formato de URL: segue sem a chave
  }

  let resposta: Response;
  try {
    resposta = await fetch(url, { headers: cabecalhos, signal: pedido.signal });
  } catch (erro) {
    console.error("[video-drive]", erro);
    return new Response(null, { status: 502 });
  }
  if (!resposta.ok) {
    // não repassa a mensagem do Google (pode citar a chave); o player cai para o modo do Drive
    console.error("[video-drive]", resposta.status, video.origemId);
    return new Response(null, { status: resposta.status === 404 || resposta.status === 403 ? 404 : 502 });
  }
  const saida = new Headers();
  for (const nome of REPASSAR) {
    const valor = resposta.headers.get(nome);
    if (valor) saida.set(nome, valor);
  }
  saida.set("accept-ranges", "bytes");
  saida.set("cache-control", "private, max-age=3600");
  // sem "attachment": o navegador toca em vez de baixar
  saida.set("content-disposition", "inline");
  return new Response(resposta.body, { status: resposta.status, headers: saida });
}
