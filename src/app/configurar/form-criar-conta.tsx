"use client";

import { criarConta } from "@/app/acoes/auth";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Input } from "@/components/ui";

export function FormCriarConta() {
  return (
    <Formulario acao={criarConta} className="flex flex-col gap-4">
      <Campo rotulo="Seu nome">
        <Input name="nome" required autoFocus />
      </Campo>
      <Campo rotulo="E-mail">
        <Input type="email" name="email" required />
      </Campo>
      <Campo rotulo="Senha">
        <Input type="password" name="senha" minLength={6} required autoComplete="new-password" />
      </Campo>
      <Campo rotulo="Confirmar senha">
        <Input type="password" name="confirmar" minLength={6} required autoComplete="new-password" />
      </Campo>
      <BotaoEnviar className="mt-2 w-full">Criar conta</BotaoEnviar>
    </Formulario>
  );
}
