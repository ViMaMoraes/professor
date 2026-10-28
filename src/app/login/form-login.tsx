"use client";

import { GraduationCap, LogIn, UserRound } from "lucide-react";
import { useState } from "react";

import { entrar, entrarAluno } from "@/app/acoes/auth";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, cn, Input } from "@/components/ui";

type Acesso = "professor" | "aluno";

/** Login com duas abas: professor (e-mail e senha) e aluno (só usuário). */
export function FormLogin({ inicial = "professor", usuarioInicial }: { inicial?: Acesso; usuarioInicial?: string }) {
  const [acesso, setAcesso] = useState<Acesso>(inicial);
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-fundo p-1" role="tablist">
        {(
          [
            { valor: "professor", nome: "Acesso professor", Icone: GraduationCap },
            { valor: "aluno", nome: "Acesso aluno", Icone: UserRound },
          ] as const
        ).map(({ valor, nome, Icone }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={acesso === valor}
            onClick={() => setAcesso(valor)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
              acesso === valor ? "bg-superficie shadow-sm" : "text-suave hover:text-texto",
            )}
          >
            <Icone className="size-4" /> {nome}
          </button>
        ))}
      </div>

      {acesso === "professor" ? (
        <Formulario key="professor" acao={entrar} className="flex flex-col gap-4">
          <Campo rotulo="E-mail">
            <Input type="email" name="email" required autoFocus autoComplete="email" />
          </Campo>
          <Campo rotulo="Senha">
            <Input type="password" name="senha" required autoComplete="current-password" />
          </Campo>
          <BotaoEnviar className="mt-2 w-full">
            <LogIn /> Entrar
          </BotaoEnviar>
        </Formulario>
      ) : (
        <Formulario key="aluno" acao={entrarAluno} className="flex flex-col gap-4">
          {usuarioInicial && <p className="text-center text-sm text-suave">Confira seu usuário e toque em Entrar.</p>}
          <Campo rotulo="Usuário" dica="O usuário que seu professor te passou.">
            <Input
              name="usuario"
              required
              autoFocus={!usuarioInicial}
              defaultValue={usuarioInicial}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ex.: julia.ramos"
            />
          </Campo>
          <BotaoEnviar className="mt-2 w-full">
            <LogIn /> Entrar
          </BotaoEnviar>
        </Formulario>
      )}
    </>
  );
}
