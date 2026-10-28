"use client";

import { definirSenha, sair } from "@/app/acoes/auth";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Input } from "@/components/ui";

export function FormTrocarSenha({ email }: { email: string }) {
  return (
    <>
      <Formulario acao={definirSenha} className="flex flex-col gap-4">
        {/* ajuda o gerenciador de senhas do navegador a salvar a senha nova com o e-mail certo */}
        <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
        <Campo rotulo="Nova senha" dica="Pelo menos 6 caracteres.">
          <Input type="password" name="novaSenha" minLength={6} required autoFocus autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Confirmar nova senha">
          <Input type="password" name="confirmar" minLength={6} required autoComplete="new-password" />
        </Campo>
        <BotaoEnviar className="mt-2 w-full">Salvar e entrar</BotaoEnviar>
      </Formulario>
      <form action={sair} className="mt-4 text-center">
        <button className="text-sm text-suave hover:text-texto">Sair</button>
      </form>
    </>
  );
}
