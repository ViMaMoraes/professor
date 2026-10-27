import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Card, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarRecibo } from "@/lib/consultas";
import { dataBR, moeda, numeroRecibo } from "@/lib/formato";
import { linkEmail, linkWhatsapp, mensagemRecibo } from "@/lib/mensagens";
import { textoRecibo } from "@/lib/recibo-pdf";

import { AcoesRecibo } from "./acoes-recibo";

export default function PaginaRecibo(props: PageProps<"/recibos/[id]">) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/recibos/[id]">["params"] }) {
  const professor = await exigirProfessor();
  const linha = await buscarRecibo(Number((await params).id));
  if (!linha) notFound();
  const { recibo, aluno } = linha;
  const numero = numeroRecibo(recibo.numero);
  const mensagem = mensagemRecibo({
    numero: recibo.numero,
    valorCentavos: recibo.valorCentavos,
    referente: recibo.referente,
    dataPagamento: recibo.dataPagamento,
    aluno: aluno.nome,
    professor: professor.nome,
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/recibos" className="text-sm text-suave hover:text-texto">
          ← Recibos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Recibo nº {numero}</h1>
      </div>

      <AcoesRecibo
        id={recibo.id}
        numero={numero}
        mensagem={mensagem}
        whatsapp={linkWhatsapp(aluno.telefone, mensagem)}
        email={linkEmail(aluno.email, `Recibo nº ${numero}`, mensagem)}
      />

      {(!professor.documento || !professor.cidade) && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Complete seu CPF/CNPJ e cidade em{" "}
            <Link href="/configuracoes" className="font-medium underline">
              Configurações
            </Link>{" "}
            para que apareçam no recibo.
          </span>
        </div>
      )}

      <Card className="max-w-3xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-marca to-fuchsia-500" />
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold tracking-[0.2em] text-marca-texto">RECIBO</p>
              <p className="text-sm text-suave">Nº {numero}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{moeda(recibo.valorCentavos)}</p>
          </div>
          <p className="mt-8 text-lg leading-relaxed">{textoRecibo(recibo, aluno)}</p>
          <p className="mt-6 text-right">
            {professor.cidade ? `${professor.cidade}, ` : ""}
            {dataBR(recibo.dataPagamento)}.
          </p>
          <div className="mx-auto mt-14 max-w-sm border-t border-texto/60 pt-2 text-center">
            <p className="font-semibold">{professor.nome}</p>
            <p className="text-xs text-suave">
              {[professor.documento && `CPF/CNPJ: ${professor.documento}`, professor.telefone && `Tel: ${professor.telefone}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {professor.endereco && <p className="text-xs text-suave">{professor.endereco}</p>}
          </div>
        </div>
      </Card>
    </>
  );
}
