"use client";

import { Eye, FileDown, SquareArrowOutUpRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { estiloBotao } from "@/components/ui";

/** Botão "Ver" da lista: abre o recibo numa janela, do jeito que sai no PDF. */
export function VerRecibo({ id, numero }: { id: number; numero: string }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex rounded-lg p-2 text-suave hover:bg-fundo hover:text-texto"
        title="Ver recibo"
        aria-label={`Ver recibo nº ${numero}`}
      >
        <Eye className="size-4" />
      </button>
      {aberto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Recibo nº ${numero}`}
            className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-superficie shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-borda px-4 py-3">
              <h3 className="font-semibold">Recibo nº {numero}</h3>
              <div className="flex items-center gap-1">
                <a href={`/api/recibos/${id}?baixar=1`} className={estiloBotao({ tamanho: "sm" })}>
                  <FileDown /> <span className="hidden sm:inline">Baixar PDF</span>
                </a>
                <Link href={`/recibos/${id}`} className={estiloBotao({ variante: "secundario", tamanho: "sm" })} title="Abrir a página do recibo (enviar, excluir...)">
                  <SquareArrowOutUpRight /> <span className="hidden sm:inline">Abrir</span>
                </Link>
                <button onClick={() => setAberto(false)} className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto" aria-label="Fechar">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <iframe src={`/folha-recibo/${id}`} title={`Recibo nº ${numero}`} className="flex-1 border-0 bg-white" />
          </div>
        </div>
      )}
    </>
  );
}
