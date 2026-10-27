"use client";

import { trocarSenhaAluno } from "@/app/acoes/configuracoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Card, Input } from "@/components/ui";

export default function PaginaTrocarSenha() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Trocar senha</h1>
      <Card className="p-6">
        <Formulario acao={trocarSenhaAluno} className="flex flex-col gap-4">
          <Campo rotulo="Senha atual">
            <Input type="password" name="atual" required autoComplete="current-password" />
          </Campo>
          <Campo rotulo="Nova senha">
            <Input type="password" name="nova" minLength={6} required autoComplete="new-password" />
          </Campo>
          <Campo rotulo="Confirmar nova senha">
            <Input type="password" name="confirmar" minLength={6} required autoComplete="new-password" />
          </Campo>
          <BotaoEnviar className="mt-2">Salvar</BotaoEnviar>
        </Formulario>
      </Card>
    </div>
  );
}
