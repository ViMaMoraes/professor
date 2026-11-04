import "server-only";

/**
 * Vídeo do Drive tocado pelo player do próprio site: o site busca o arquivo no Drive e repassa para o
 * navegador, inclusive os pedidos de "trecho" (Range), que permitem avançar e voltar. Com a chave
 * GOOGLE_API_KEY usa a API oficial do Drive; sem ela, o endereço público de download (o mesmo do botão
 * "Baixar"). Funciona com arquivos compartilhados como "Qualquer pessoa com o link".
 */
export function chaveGoogle() {
  return process.env.GOOGLE_API_KEY?.trim() || null;
}

/** Cabeçalhos que passam do Drive para o navegador. */
const REPASSAR = ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"];

function enderecoNoDrive(origemId: string, chave: string | null, recurso: string | null) {
  if (chave) {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(origemId)}`);
    url.searchParams.set("alt", "media");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("key", chave);
    return url;
  }
  // confirm=t pula o aviso "não foi possível verificar vírus" dos arquivos grandes
  const url = new URL("https://drive.usercontent.google.com/download");
  url.searchParams.set("id", origemId);
  url.searchParams.set("export", "download");
  url.searchParams.set("confirm", "t");
  if (recurso) url.searchParams.set("resourcekey", recurso);
  return url;
}

export async function buscarVideoDrive(video: { origemId: string; link: string }, pedido: Request, chave: string | null) {
  const cabecalhos = new Headers();
  const trecho = pedido.headers.get("range");
  if (trecho) cabecalhos.set("range", trecho);
  // arquivos compartilhados antes de 2021 exigem a resourcekey do link original
  let recurso: string | null = null;
  try {
    recurso = new URL(video.link).searchParams.get("resourcekey");
  } catch {
    // link sem formato de URL: segue sem a chave
  }
  if (recurso) cabecalhos.set("x-goog-drive-resource-keys", `${video.origemId}/${recurso}`);
  const url = enderecoNoDrive(video.origemId, chave, recurso);

  let resposta: Response;
  try {
    resposta = await fetch(url, { headers: cabecalhos, signal: pedido.signal });
  } catch (erro) {
    console.error("[video-drive]", erro);
    return new Response(null, { status: 502 });
  }
  // sem a chave, um arquivo não público (ou bloqueado) volta como página do Google, não como vídeo
  const tipo = resposta.headers.get("content-type") ?? "";
  if (resposta.ok && /^text\/html/i.test(tipo)) {
    console.error("[video-drive] página no lugar do vídeo", video.origemId);
    await resposta.body?.cancel();
    return new Response(null, { status: 404 });
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
