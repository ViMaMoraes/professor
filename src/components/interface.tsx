"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Botao, cn } from "./ui";

type TipoAviso = "ok" | "erro" | "aviso" | "info";
type Toast = { id: number; tipo: TipoAviso; texto: string };
type Confirmacao = {
  titulo: string;
  mensagem?: ReactNode;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
};

type Interface = {
  /** Abre uma janela de confirmação e resolve com true/false. */
  confirmar: (opcoes: Confirmacao | string) => Promise<boolean>;
  /** Mostra um aviso rápido no canto da tela. */
  notificar: (texto: string, tipo?: TipoAviso) => void;
};

const Contexto = createContext<Interface | null>(null);

export function useInterface() {
  const valor = use(Contexto);
  if (!valor) throw new Error("useInterface precisa do ProvedorInterface");
  return valor;
}

/** Janelas de confirmação e avisos do site (no lugar do confirm/alert do navegador). */
export function ProvedorInterface({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pedido, setPedido] = useState<(Confirmacao & { responder: (sim: boolean) => void }) | null>(null);
  const proximoId = useRef(0);

  const notificar = useCallback((texto: string, tipo: TipoAviso = "ok") => {
    const id = ++proximoId.current;
    setToasts((t) => [...t.slice(-3), { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === "erro" ? 8000 : 4500);
  }, []);

  const confirmar = useCallback(
    (opcoes: Confirmacao | string) =>
      new Promise<boolean>((resolve) => {
        const dados = typeof opcoes === "string" ? { titulo: opcoes } : opcoes;
        setPedido({ ...dados, responder: resolve });
      }),
    [],
  );

  const responder = (sim: boolean) => {
    pedido?.responder(sim);
    setPedido(null);
  };

  return (
    <Contexto value={{ confirmar, notificar }}>
      {children}
      {pedido && <JanelaConfirmacao pedido={pedido} responder={responder} />}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:top-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} fechar={() => setToasts((lista) => lista.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </Contexto>
  );
}

const ICONES = { ok: CircleCheck, erro: CircleAlert, aviso: TriangleAlert, info: Info };
const CORES = {
  ok: "text-emerald-600 dark:text-emerald-400",
  erro: "text-red-600 dark:text-red-400",
  aviso: "text-amber-600 dark:text-amber-400",
  info: "text-suave",
};

function ToastItem({ toast, fechar }: { toast: Toast; fechar: () => void }) {
  const Icone = ICONES[toast.tipo];
  return (
    <div
      role={toast.tipo === "erro" ? "alert" : "status"}
      className="animate-entrar pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 text-sm shadow-xl"
    >
      <Icone className={cn("mt-0.5 size-4 shrink-0", CORES[toast.tipo])} />
      <span className="flex-1">{toast.texto}</span>
      <button onClick={fechar} className="text-suave hover:text-texto" aria-label="Fechar aviso">
        <X className="size-4" />
      </button>
    </div>
  );
}

function JanelaConfirmacao({
  pedido,
  responder,
}: {
  pedido: Confirmacao;
  responder: (sim: boolean) => void;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botaoRef.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && responder(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [responder]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => responder(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacao-titulo"
        className="animate-entrar w-full max-w-sm rounded-2xl border border-borda bg-superficie p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              pedido.perigo ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-marca-suave text-marca-texto",
            )}
          >
            {pedido.perigo ? <TriangleAlert className="size-5" /> : <Info className="size-5" />}
          </span>
          <div>
            <h2 id="confirmacao-titulo" className="font-semibold">
              {pedido.titulo}
            </h2>
            {pedido.mensagem && <div className="mt-1 text-sm text-suave">{pedido.mensagem}</div>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => responder(false)}>
            {pedido.cancelar ?? "Cancelar"}
          </Botao>
          <Botao
            ref={botaoRef}
            onClick={() => responder(true)}
            className={pedido.perigo ? "bg-red-600 text-white hover:bg-red-700" : undefined}
          >
            {pedido.confirmar ?? "Confirmar"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
