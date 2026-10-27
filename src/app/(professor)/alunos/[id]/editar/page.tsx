import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarAluno, listarInstituicoes } from "@/lib/consultas";

import { FormAluno } from "../../form-aluno";

export default function PaginaEditarAluno(props: PageProps<"/alunos/[id]/editar">) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/alunos/[id]/editar">["params"] }) {
  const professor = await exigirProfessor();
  const aluno = await buscarAluno(professor.id, Number((await params).id));
  if (!aluno) notFound();
  const { senhaHash, ...dados } = aluno;
  return (
    <>
      <Cabecalho titulo={`Editar ${aluno.nome}`} />
      <FormAluno
        aluno={{ ...dados, temAcesso: Boolean(aluno.email && senhaHash) }}
        instituicoes={(await listarInstituicoes(professor.id, { situacao: "todas" })).map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
      />
    </>
  );
}
