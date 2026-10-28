"use client";

import { Check, Copy, KeyRound, MessageCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useInterface } from "@/components/interface";
import { Botao, Card, estiloBotao } from "@/components/ui";
import { NOME_APP } from "@/lib/marca";

const nada = () => () => {};

/** Dados de acesso com a senha provisória: aparecem uma vez só, para o master passar ao professor. */
export function Credenciais({ nome, email, senha, nova }: { nome: string; email: string; senha: string; nova: boolean }) {
  const origem = useSyncExternalStore(nada, () => window.location.origin, () => "");
  const { notificar } = useInterface();
  const [copiado, setCopiado] = useState<string | null>(null);
  const link = `${origem}/login`;
  const mensagem =
    `Olá, ${nome.split(" ")[0]}! ${nova ? `Sua conta no ${NOME_APP} está pronta.` : "Sua senha foi redefinida."}\n\n` +
    `Acesse: ${link}\nE-mail: ${email}\nSenha provisória: ${senha}\n\n` +
    "No primeiro acesso, o site vai pedir para você criar a sua própria senha.";

  async function copiar(texto: string, qual: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      notificar("Copiado!");
    } catch {
      notificar("Não foi possível copiar. Selecione e copie manualmente.", "erro");
    }
  }

  const linha = (rotulo: string, valor: string, qual: string) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-borda px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-suave">{rotulo}</p>
        <p className="truncate font-mono text-sm">{valor}</p>
      </div>
      <button
        type="button"
        onClick={() => copiar(valor, qual)}
        className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-texto"
        aria-label={`Copiar ${rotulo.toLowerCase()}`}
      >
        {copiado === qual ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );

  return (
    <Card className="max-w-2xl p-5" role="region" aria-label="Dados de acesso">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-marca-suave p-2.5 text-marca-texto">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">{nova ? "Conta criada" : "Nova senha gerada"}</h2>
          <p className="text-sm text-suave">
            Envie estes dados para {nome}. A senha aparece só agora; no primeiro login o site pede para trocar.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {linha("E-mail", email, "email")}
        {linha("Senha provisória", senha, "senha")}
        <div className="sm:col-span-2">{linha("Link de acesso", link, "link")}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Botao type="button" onClick={() => copiar(mensagem, "mensagem")}>
          {copiado === "mensagem" ? <Check /> : <Copy />} Copiar mensagem
        </Botao>
        <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener" className={estiloBotao({ variante: "sucesso" })}>
          <MessageCircle /> Enviar por WhatsApp
        </a>
      </div>
    </Card>
  );
}
