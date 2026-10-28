"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { gerarNovaSenha } from "@/app/acoes/admin";
import { useInterface } from "@/components/interface";
import { Botao, Card } from "@/components/ui";

import { Credenciais } from "../credenciais";

/** Gera uma nova senha provisória (ex.: o professor esqueceu a dele). */
export function RedefinirSenha({
  id,
  nome,
  email,
  pendente,
  endereco,
}: {
  id: number;
  nome: string;
  email: string;
  pendente: boolean;
  endereco: string | null;
}) {
  const [senha, setSenha] = useState<string | null>(null);
  const [gerando, iniciar] = useTransition();
  const { confirmar, notificar } = useInterface();

  if (senha) return <Credenciais nome={nome} email={email} senha={senha} nova={false} endereco={endereco} />;

  return (
    <Card className="max-w-2xl p-5">
      <h2 className="font-semibold">Senha</h2>
      <p className="mt-1 mb-4 text-sm text-suave">
        {pendente
          ? "O professor ainda está com a senha provisória (não fez o primeiro acesso). "
          : "O professor usa a senha que ele mesmo criou. "}
        Se ele esqueceu, gere uma nova senha provisória; no próximo login ele cria outra.
      </p>
      <Botao
        variante="secundario"
        disabled={gerando}
        onClick={async () => {
          const ok = await confirmar({
            titulo: `Gerar nova senha para ${nome}?`,
            mensagem: "A senha atual deixa de funcionar na hora.",
            confirmar: "Gerar senha",
          });
          if (!ok) return;
          iniciar(async () => {
            const resultado = await gerarNovaSenha(id);
            if (resultado.senha) setSenha(resultado.senha);
            else notificar(resultado.erro ?? "Não foi possível gerar a senha.", "erro");
          });
        }}
      >
        {gerando ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Gerar nova senha
      </Botao>
    </Card>
  );
}
