import { notFound } from "next/navigation";

import { Cabecalho, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarInstituicao } from "@/lib/consultas";

import { FormInstituicao } from "../../form-instituicao";
import { opcoesDeAlunos } from "../../opcoes-alunos";

export default async function PaginaEditarInstituicao(props: PageProps<"/instituicoes/[id]/editar">) {
  const professor = await exigirProfessor();
  const instituicao = await buscarInstituicao(professor.id, Number((await props.params).id));
  if (!instituicao) notFound();
  return (
    <>
      <Voltar href={`/instituicoes/${instituicao.id}`}>{`Voltar para ${instituicao.nome}`}</Voltar>
      <Cabecalho titulo={`Editar ${instituicao.nome}`} />
      <FormInstituicao instituicao={instituicao} alunos={await opcoesDeAlunos(professor.id, instituicao.id)} />
    </>
  );
}
