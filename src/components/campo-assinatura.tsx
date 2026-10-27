"use client";

import { Eraser, ImageUp, PenLine, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao } from "./ui";

const LARGURA = 600;
const ALTURA = 200;

/**
 * Assinatura para o recibo: desenhar com o dedo/mouse ou enviar uma imagem.
 * O resultado (PNG com fundo transparente) vai no campo escondido `name`.
 * Valor vazio + `removerName` marcado = apagar a assinatura salva.
 */
export function CampoAssinatura({ name, atual }: { name: string; atual: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [valor, setValor] = useState("");
  const [removida, setRemovida] = useState(false);
  const [editando, setEditando] = useState(!atual);

  useEffect(() => {
    if (!editando) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
  }, [editando]);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * LARGURA, y: ((e.clientY - r.top) / r.height) * ALTURA };
  }

  function salvar() {
    setValor(canvasRef.current!.toDataURL("image/png"));
  }

  function limpar() {
    canvasRef.current!.getContext("2d")!.clearRect(0, 0, LARGURA, ALTURA);
    setValor("");
  }

  /** Coloca a imagem enviada no quadro, ajustada ao tamanho, e tira o fundo branco. */
  async function enviarImagem(arquivo: File) {
    const img = await createImageBitmap(arquivo);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    const escala = Math.min(LARGURA / img.width, ALTURA / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, (LARGURA - w) / 2, (ALTURA - h) / 2, w, h);
    const pixels = ctx.getImageData(0, 0, LARGURA, ALTURA);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const claro = pixels.data[i] > 225 && pixels.data[i + 1] > 225 && pixels.data[i + 2] > 225;
      if (claro) pixels.data[i + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
    salvar();
  }

  if (!editando && atual && !removida) {
    return (
      <div className="space-y-2">
        <div className="flex h-28 items-center justify-center rounded-xl border border-borda bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL salva no banco */}
          <img src={atual} alt="Assinatura salva" className="max-h-full max-w-full" />
        </div>
        <div className="flex gap-2">
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setEditando(true)}>
            <PenLine /> Trocar assinatura
          </Botao>
          <Botao type="button" variante="perigo" tamanho="sm" onClick={() => setRemovida(true)}>
            <Trash2 /> Remover
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={valor} />
      {removida && <input type="hidden" name={`remover_${name}`} value="1" />}
      {removida && !editando ? (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-borda p-4 text-sm text-suave">
          A assinatura será removida ao salvar.
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setRemovida(false)}>
            Desfazer
          </Botao>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={LARGURA}
            height={ALTURA}
            className="aspect-[3/1] w-full touch-none rounded-xl border border-dashed border-borda bg-white"
            onPointerDown={(e) => {
              desenhando.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              const ctx = e.currentTarget.getContext("2d")!;
              const p = ponto(e);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
            }}
            onPointerMove={(e) => {
              if (!desenhando.current) return;
              const ctx = e.currentTarget.getContext("2d")!;
              const p = ponto(e);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }}
            onPointerUp={() => {
              desenhando.current = false;
              salvar();
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Botao type="button" variante="secundario" tamanho="sm" onClick={limpar}>
              <Eraser /> Limpar
            </Botao>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-fundo [&_svg]:size-4">
              <ImageUp /> Enviar imagem
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && enviarImagem(e.target.files[0])}
              />
            </label>
            {atual && (
              <Botao
                type="button"
                variante="fantasma"
                tamanho="sm"
                onClick={() => {
                  setEditando(false);
                  setValor("");
                }}
              >
                Manter a atual
              </Botao>
            )}
            <span className="text-xs text-suave">Assine no quadro com o dedo ou o mouse, ou envie uma foto da assinatura em papel branco.</span>
          </div>
        </>
      )}
    </div>
  );
}
