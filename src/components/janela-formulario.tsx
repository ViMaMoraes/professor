"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

import type { EstadoForm } from "@/lib/estado-form";

import { BotaoEnviar, Formulario } from "./formulario";
import { Botao } from "./ui";

/** Botão que abre uma janela com um formulário (ex.: desmarcar aula, agendar reposição). Fecha ao concluir. */
export function JanelaFormulario({
  rotulo,
  titulo,
  subtitulo,
  acao,
  enviar,
  children,
  ...botao
}: Omit<ComponentProps<typeof Botao>, "onClick" | "children"> & {
  rotulo: ReactNode;
  titulo: string;
  subtitulo?: string;
  acao: (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;
  enviar: ReactNode;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <Botao type="button" {...botao} onClick={() => setAberto(true)}>
        {rotulo}
      </Botao>
      {aberto && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setAberto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            className="animate-entrar w-full max-w-md rounded-2xl bg-superficie p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{titulo}</h2>
                {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
              </div>
              <button onClick={() => setAberto(false)} className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <Formulario acao={acao} aoConcluir={() => setAberto(false)} className="space-y-3">
              {children}
              <div className="flex gap-2 pt-1">
                <BotaoEnviar>{enviar}</BotaoEnviar>
                <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
                  Cancelar
                </Botao>
              </div>
            </Formulario>
          </div>
        </div>
      )}
    </>
  );
}
