"use client";

import { Eye, FileDown, Mail, MessageCircle, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { excluirRecibo } from "@/app/acoes/recibos";
import { BotaoAcao } from "@/components/botao-acao";
import { Botao, estiloBotao } from "@/components/ui";

const nada = () => () => {};

/** Compartilhar arquivo (ex.: direto no WhatsApp) só existe em celulares e alguns navegadores. */
function suportaCompartilharArquivo() {
  const teste = new File([""], "teste.pdf", { type: "application/pdf" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [teste] });
}

export function AcoesRecibo({
  id,
  numero,
  mensagem,
  whatsapp,
  email,
}: {
  id: number;
  numero: string;
  mensagem: string;
  whatsapp: string;
  email: string;
}) {
  const podeCompartilhar = useSyncExternalStore(nada, suportaCompartilharArquivo, () => false);
  const [compartilhando, setCompartilhando] = useState(false);

  async function compartilhar() {
    setCompartilhando(true);
    try {
      const resposta = await fetch(`/api/recibos/${id}`);
      const arquivo = new File([await resposta.blob()], `recibo-${numero}.pdf`, { type: "application/pdf" });
      await navigator.share({ files: [arquivo], title: `Recibo nº ${numero}`, text: mensagem });
    } catch {
      // usuário cancelou o compartilhamento
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <div className="mb-6 space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/recibos/${id}?baixar=1`} className={estiloBotao()}>
          <FileDown /> Baixar PDF
        </a>
        <a href={`/api/recibos/${id}`} target="_blank" rel="noopener" className={estiloBotao({ variante: "secundario" })}>
          <Eye /> Abrir / imprimir
        </a>
        {podeCompartilhar && (
          <Botao variante="secundario" onClick={compartilhar} disabled={compartilhando}>
            <Share2 /> Compartilhar PDF
          </Botao>
        )}
        <a href={whatsapp} target="_blank" rel="noopener" className={estiloBotao({ variante: "sucesso" })}>
          <MessageCircle /> WhatsApp
        </a>
        <a href={email} className={estiloBotao({ variante: "secundario" })}>
          <Mail /> E-mail
        </a>
        <Link href={`/recibos/${id}/editar`} className={estiloBotao({ variante: "secundario" }, "sm:ml-auto")}>
          <Pencil /> Editar
        </Link>
        <BotaoAcao
          acao={excluirRecibo.bind(null, id, true)}
          confirmar={`Excluir o recibo nº ${numero}?`}
          variante="perigo"
        >
          <Trash2 /> Excluir
        </BotaoAcao>
      </div>
      <p className="text-xs text-suave">
        WhatsApp e e-mail abrem com uma mensagem pronta; anexe o PDF baixado.
        {podeCompartilhar && " No celular, “Compartilhar PDF” envia o arquivo direto pelo app que você escolher."}
      </p>
    </div>
  );
}
