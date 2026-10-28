import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarRecibo, listarAlunos, listarInstituicoes } from "@/lib/consultas";
import { hojeISO, numeroRecibo } from "@/lib/formato";

import { FormRecibo } from "../../novo/form-recibo";

export const metadata: Metadata = { title: "Editar recibo" };

export default function PaginaEditarRecibo(props: PageProps<"/recibos/[id]/editar">) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/recibos/[id]/editar">["params"] }) {
  const professor = await exigirProfessor();
  const linha = await buscarRecibo(Number((await params).id), { professorId: professor.id });
  if (!linha) notFound();
  // inclui inativos: o recibo pode ser de um aluno ou instituição que não está mais ativo
  const [alunos, instituicoes] = await Promise.all([
    listarAlunos(professor.id, { situacao: "todos" }),
    listarInstituicoes(professor.id, { situacao: "todas" }),
  ]);
  return (
    <>
      <Cabecalho titulo={`Editar recibo nº ${numeroRecibo(linha.recibo.numero)}`} descricao="O número do recibo continua o mesmo." />
      <FormRecibo
        alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, mensalidade: a.mensalidadeCentavos, descricao: a.descricaoRecibo }))}
        instituicoes={instituicoes.map(({ instituicao: i }) => ({
          id: i.id,
          nome: i.nome,
          mensalidade: i.valorMensalCentavos,
          descricao: i.descricaoRecibo,
        }))}
        hoje={hojeISO()}
        referentePadrao="às aulas"
        recibo={linha.recibo}
      />
    </>
  );
}
