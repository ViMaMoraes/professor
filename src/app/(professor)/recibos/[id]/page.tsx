import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FolhaRecibo } from "@/components/folha-recibo";
import { EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarRecibo } from "@/lib/consultas";
import { numeroRecibo } from "@/lib/formato";
import { linkEmail, linkWhatsapp, mensagemRecibo } from "@/lib/mensagens";
import { pagadorDoRecibo } from "@/lib/pagador";

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
  const linha = await buscarRecibo(Number((await params).id), { professorId: professor.id });
  if (!linha) notFound();
  const { recibo } = linha;
  const pagador = pagadorDoRecibo(linha.aluno, linha.instituicao);
  const numero = numeroRecibo(recibo.numero);
  const mensagem = mensagemRecibo({
    numero: recibo.numero,
    valorCentavos: recibo.valorCentavos,
    referente: recibo.referente,
    dataPagamento: recibo.dataPagamento,
    pagador: pagador.nome,
    professor: professor.nome,
  });

  return (
    <>
      <div className="mb-6">
        <Link href="/recibos" className="text-sm text-suave hover:text-texto">
          ← Recibos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Recibo nº {numero}</h1>
        <p className="text-sm text-suave">
          {pagador.tipo === "instituicao" ? "Instituição: " : "Aluno: "}
          <Link
            href={recibo.instituicaoId ? `/instituicoes/${recibo.instituicaoId}` : `/alunos/${recibo.alunoId}`}
            className="text-marca-texto hover:underline"
          >
            {pagador.nome}
          </Link>
        </p>
      </div>

      <AcoesRecibo
        id={recibo.id}
        numero={numero}
        mensagem={mensagem}
        whatsapp={linkWhatsapp(pagador.telefone, mensagem)}
        email={linkEmail(pagador.email, `Recibo nº ${numero}`, mensagem)}
      />

      {(!professor.documento || !professor.cidade || !professor.assinatura) && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Complete seus dados (CPF, RG, endereço, cidade) e a assinatura em{" "}
            <Link href="/configuracoes" className="font-medium underline">
              Configurações
            </Link>{" "}
            para que apareçam no recibo.
          </span>
        </div>
      )}

      {/* mesma aparência do PDF: folha branca, como no papel */}
      <FolhaRecibo recibo={recibo} pagador={pagador} professor={professor} className="max-w-3xl rounded-2xl border border-borda shadow-xs" />
    </>
  );
}
