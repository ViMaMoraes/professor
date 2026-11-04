"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition, type ComponentProps, type ReactNode } from "react";

import { useInterface } from "./interface";
import { Botao } from "./ui";

/** Botão que chama uma Server Action, com confirmação (janela do site) e aviso de sucesso opcionais. */
export function BotaoAcao({
  acao,
  confirmar,
  detalhe,
  sucesso,
  children,
  ...props
}: Omit<ComponentProps<typeof Botao>, "onClick"> & {
  acao: () => Promise<unknown>;
  /** Pergunta da janela de confirmação. */
  confirmar?: string;
  /** Texto menor embaixo da pergunta. */
  detalhe?: ReactNode;
  /** Aviso mostrado depois que a ação terminar. */
  sucesso?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const { confirmar: perguntar, notificar } = useInterface();
  return (
    <Botao
      {...props}
      disabled={pendente || props.disabled}
      onClick={async () => {
        if (
          confirmar &&
          !(await perguntar({
            titulo: confirmar,
            mensagem: detalhe,
            perigo: props.variante === "perigo",
            confirmar: props.variante === "perigo" ? "Sim, continuar" : "Confirmar",
          }))
        ) {
          return;
        }
        iniciar(async () => {
          const resultado = await acao();
          // a ação pode recusar (ex.: limite do plano) devolvendo { erro }
          const erro = resultado && typeof resultado === "object" && "erro" in resultado ? resultado.erro : null;
          if (typeof erro === "string" && erro) notificar(erro, "erro");
          else if (sucesso) notificar(sucesso);
        });
      }}
    >
      {pendente && <LoaderCircle className="animate-spin" />}
      {children}
    </Botao>
  );
}
