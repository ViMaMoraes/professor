"use client";

import { RotateCcw, SkipForward } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { estiloBotao } from "./ui";

const nada = () => () => {};

/**
 * Player do vídeo dentro do site. O que nos players leva para fora (o botão "abrir" do Drive, o título e
 * o compartilhar do YouTube) fica coberto por uma camada transparente; no fim de um vídeo do YouTube,
 * em vez das sugestões deles, aparece a tela do site com "assistir de novo" e "próximo vídeo".
 */
export function PlayerVideo({
  origem,
  url,
  arquivo,
  capa,
  titulo,
  proximo,
  aoAbrir,
  vertical = false,
}: {
  origem: "drive" | "youtube";
  url: string;
  /** vídeo do Drive tocado pelo player do próprio site (precisa da chave do Google); sem ele, usa o player do Drive */
  arquivo?: string | null;
  capa?: string;
  titulo: string;
  proximo?: { href: string; titulo: string } | null;
  /** chamado uma vez quando o player abre (ex.: registrar que o aluno assistiu) */
  aoAbrir?: () => void;
  /** já se sabe que o vídeo é em pé (ex.: YouTube Shorts) */
  vertical?: boolean;
}) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const nativo = useRef<HTMLVideoElement>(null);
  const [terminou, setTerminou] = useState(false);
  // se o Google não entregar o arquivo (ex.: sem compartilhamento público), cai para o player do Drive
  const [semNativo, setSemNativo] = useState(false);
  const usarNativo = origem === "drive" && Boolean(arquivo) && !semNativo;
  // formato do vídeo (largura / altura): vídeo gravado em pé ganha um player em pé
  const [proporcao, setProporcao] = useState(vertical ? 9 / 16 : 16 / 9);

  // Drive: descobre o formato pela capa (a miniatura tem o mesmo formato do vídeo)
  useEffect(() => {
    if (origem !== "drive" || !capa) return;
    const imagem = new Image();
    imagem.referrerPolicy = "no-referrer";
    imagem.onload = () => imagem.naturalWidth && imagem.naturalHeight && setProporcao(imagem.naturalWidth / imagem.naturalHeight);
    imagem.src = capa;
    return () => {
      imagem.onload = null;
    };
  }, [origem, capa]);
  // endereço do site (o YouTube só manda os eventos do player para ele); no servidor ainda não existe
  const origemSite = useSyncExternalStore(nada, () => window.location.origin, () => null);

  useEffect(() => {
    aoAbrir?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez por vídeo
  }, [url]);

  // YouTube: escuta os eventos do player (precisa do endereço do site no parâmetro "origin")
  useEffect(() => {
    if (origem !== "youtube") return;
    function receber(e: MessageEvent) {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      try {
        const dados = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const estado = dados?.event === "onStateChange" ? dados.info : dados?.event === "infoDelivery" ? dados.info?.playerState : undefined;
        if (estado === 0) setTerminou(true); // 0 = terminou
        if (estado === 1) setTerminou(false); // 1 = tocando
      } catch {
        // mensagem que não é do player
      }
    }
    window.addEventListener("message", receber);
    return () => window.removeEventListener("message", receber);
  }, [origem]);

  const comando = (func: string, args: unknown[] = []) =>
    quadro.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  const src = origem === "youtube" ? (origemSite ? `${url}&enablejsapi=1&origin=${encodeURIComponent(origemSite)}` : null) : url;

  function deNovo() {
    setTerminou(false);
    if (usarNativo && nativo.current) {
      nativo.current.currentTime = 0;
      void nativo.current.play();
    } else {
      comando("seekTo", [0, true]);
      comando("playVideo");
    }
  }

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-2xl bg-black"
      // ocupa a largura toda, mas nunca mais que 80% da altura da tela (assim os controles sempre aparecem)
      style={{ aspectRatio: proporcao, width: `min(100%, calc(80svh * ${proporcao.toFixed(4)}))` }}
    >
      {usarNativo && (
        <video
          ref={nativo}
          src={arquivo!}
          poster={capa}
          title={titulo}
          controls
          playsInline
          preload="metadata"
          // sem botão de baixar nem "abrir em outro lugar" no menu do player
          controlsList="nodownload noremoteplayback"
          disableRemotePlayback
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setSemNativo(true)}
          onLoadedMetadata={(e) => e.currentTarget.videoWidth && setProporcao(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
          onEnded={() => setTerminou(true)}
          onPlay={() => setTerminou(false)}
          className="absolute inset-0 size-full"
        />
      )}
      {!usarNativo && src && (
        <iframe
          ref={quadro}
          src={src}
          title={titulo}
          className="absolute inset-0 size-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => origem === "youtube" && quadro.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*")}
        />
      )}
      {/* camadas que impedem sair do site pelos atalhos dos players */}
      {origem === "drive" && !usarNativo && <div className="absolute top-0 right-0 h-16 w-20" aria-hidden />}
      {origem === "youtube" && <div className="absolute inset-x-0 top-0 h-16" aria-hidden />}
      {terminou && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 text-center text-white">
          <p className="text-sm opacity-80">Fim do vídeo</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={deNovo}
              className={estiloBotao({ variante: "secundario" }, "border-white/30 bg-white/10 text-white hover:bg-white/20")}
            >
              <RotateCcw /> Assistir de novo
            </button>
            {proximo && (
              <Link href={proximo.href} className={estiloBotao({}, "bg-white text-black hover:bg-white/90")}>
                <SkipForward /> {proximo.titulo}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
