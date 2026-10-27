"use client";

import { LogIn } from "lucide-react";

import { entrar } from "@/app/acoes/auth";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Input } from "@/components/ui";

export function FormLogin() {
  return (
    <Formulario acao={entrar} className="flex flex-col gap-4">
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
  );
}
