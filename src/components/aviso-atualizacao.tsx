"use client";

import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Botao } from "./ui";

const INTERVALO = 15 * 60 * 1000;

/**
 * Avisa quando uma versão nova do site foi publicada enquanto esta página (ou o app instalado)
 * estava aberta ou guardada em cache. "Atualizar" recarrega já com a versão nova.
 */
export function AvisoAtualizacao({ versao }: { versao: string }) {
  const [nova, setNova] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function conferir() {
      if (document.visibilityState !== "visible") return;
      try {
        const resposta = await fetch("/api/versao", { cache: "no-store" });
        const { versao: noAr } = (await resposta.json()) as { versao?: string };
        if (ativo && noAr && noAr !== versao) setNova(true);
      } catch {
        // sem internet: confere de novo depois
      }
    }
    conferir();
    const intervalo = setInterval(conferir, INTERVALO);
    // ao voltar para o app (ex.: estava em segundo plano no celular)
    document.addEventListener("visibilitychange", conferir);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", conferir);
    };
  }, [versao]);

  async function atualizar() {
    setAtualizando(true);
    try {
      await (await navigator.serviceWorker?.getRegistration())?.update();
    } catch {
      // segue para recarregar mesmo assim
    }
    window.location.reload();
  }

  if (!nova || dispensado) return null;

  return (
    <div
      role="status"
      className="animate-entrar fixed inset-x-3 bottom-4 z-[85] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 pl-4 shadow-2xl"
    >
      <RefreshCw className="size-5 shrink-0 text-marca-texto" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Nova versão disponível</p>
        <p className="text-suave">Atualize para usar a versão mais recente.</p>
      </div>
      <Botao tamanho="sm" onClick={atualizar} disabled={atualizando}>
        {atualizando ? <RefreshCw className="animate-spin" /> : null} Atualizar
      </Botao>
      <button onClick={() => setDispensado(true)} className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto" aria-label="Agora não">
        <X className="size-4" />
      </button>
    </div>
  );
}
