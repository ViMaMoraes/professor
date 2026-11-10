"use client";

import { Check, Copy, Link2, MessageCircle } from "lucide-react";
import { useState } from "react";

import { useInterface } from "@/components/interface";
import { useEnderecoSite } from "@/components/use-endereco-site";
import { Botao, Card, CardTitulo, estiloBotao } from "@/components/ui";
import { primeiroNome } from "@/lib/formato";
import { linkWhatsapp } from "@/lib/mensagens";

/** Link pessoal do aluno (com a chave dele: entra direto, sem usuário nem código) e mensagem pronta para mandar. */
export function CompartilharAcesso({
  nome,
  usuario,
  chave,
  telefone,
  endereco,
}: {
  nome: string;
  usuario: string;
  /** chave secreta do link pessoal */
  chave: string;
  telefone: string | null;
  endereco: string | null;
}) {
  const origem = useEnderecoSite(endereco);
  const { notificar } = useInterface();
  const [copiado, setCopiado] = useState<"link" | "mensagem" | null>(null);

  const link = `${origem}/a/${chave}`;
  const mensagem =
    `Olá, ${primeiroNome(nome)}! Aqui você acessa os materiais e o diário das nossas aulas:\n${link}\n\n` +
    `É só tocar no link para entrar. Se um dia pedir, seu usuário é: ${usuario}\n\n` +
    "Dica: no celular, adicione o site à tela inicial para usar como app e ative as notificações para saber quando chegar material novo.";

  async function copiar(texto: string, qual: "link" | "mensagem") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      notificar(qual === "link" ? "Link copiado!" : "Mensagem copiada!");
    } catch {
      notificar("Não foi possível copiar. Selecione e copie manualmente.", "erro");
    }
  }

  return (
    <Card>
      <CardTitulo icone={<Link2 />}>Acesso do aluno</CardTitulo>
      <div className="space-y-3 p-5">
        <p className="rounded-lg bg-fundo px-3 py-2 font-mono text-xs break-all">{link}</p>
        <div className="flex flex-wrap gap-2">
          <Botao type="button" tamanho="sm" onClick={() => copiar(link, "link")}>
            {copiado === "link" ? <Check /> : <Copy />} Copiar link
          </Botao>
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => copiar(mensagem, "mensagem")}>
            {copiado === "mensagem" ? <Check /> : <Copy />} Copiar mensagem
          </Botao>
          <a href={linkWhatsapp(telefone, mensagem)} target="_blank" rel="noopener" className={estiloBotao({ variante: "sucesso", tamanho: "sm" })}>
            <MessageCircle /> WhatsApp
          </a>
        </div>
        <p className="text-xs text-suave">
          O link é só deste aluno e já entra direto, sem usuário nem código. Depois da primeira vez, o celular dele lembra o acesso.
          {!telefone && " Sem telefone no cadastro, o WhatsApp abre para você escolher o contato."}
        </p>
      </div>
    </Card>
  );
}
