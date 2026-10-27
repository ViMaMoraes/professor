"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { createContext, startTransition, use, useActionState, type ComponentProps, type ReactNode } from "react";

import type { EstadoForm } from "@/lib/estado-form";

import { Botao, cn } from "./ui";

const Enviando = createContext(false);

/**
 * Form ligado a uma Server Action com mensagens de erro/sucesso.
 * Envia via onSubmit (e não via prop `action`) para o React não limpar os campos quando há erro.
 */
export function Formulario({
  acao,
  children,
  className,
  confirmar,
}: {
  acao: (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;
  children: ReactNode;
  className?: string;
  confirmar?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, null);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const dados = new FormData(e.currentTarget);
        startTransition(() => executar(dados));
      }}
    >
      <Enviando value={enviando}>
        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
        {children}
      </Enviando>
    </form>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok"; children: ReactNode }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        tipo === "erro"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {tipo === "erro" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export function BotaoEnviar({ children, ...props }: ComponentProps<typeof Botao>) {
  const enviando = use(Enviando);
  return (
    <Botao type="submit" disabled={enviando || props.disabled} {...props}>
      {enviando && <LoaderCircle className="animate-spin" />}
      {children}
    </Botao>
  );
}
