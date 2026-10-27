"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition, type ComponentProps } from "react";

import { Botao } from "./ui";

/** Botão que chama uma Server Action (com confirmação opcional). */
export function BotaoAcao({
  acao,
  confirmar,
  children,
  ...props
}: Omit<ComponentProps<typeof Botao>, "onClick"> & { acao: () => Promise<unknown>; confirmar?: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Botao
      {...props}
      disabled={pendente || props.disabled}
      onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return;
        iniciar(async () => {
          await acao();
        });
      }}
    >
      {pendente && <LoaderCircle className="animate-spin" />}
      {children}
    </Botao>
  );
}
