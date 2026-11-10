import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina, Voltar } from "@/components/ui";
import { exigirAcesso } from "@/lib/auth";
import { buscarAluno, equipePorAluno, horariosDoAluno, listarInstituicoes } from "@/lib/consultas";

import { FormAluno } from "../../form-aluno";
import { opcoesDoFormulario } from "../../opcoes-equipe";

export default function PaginaEditarAluno(props: PageProps<"/alunos/[id]/editar">) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/alunos/[id]/editar">["params"] }) {
  const { professor, acesso } = await exigirAcesso("alunos");
  const aluno = await buscarAluno(professor, Number((await params).id));
  if (!aluno) notFound();
  const { senhaHash, ...dados } = aluno;
  void senhaHash;
  return (
    <>
      <Voltar href={`/alunos/${aluno.id}`}>{`Voltar para ${aluno.nome}`}</Voltar>
      <Cabecalho titulo={`Editar ${aluno.nome}`} />
      <FormAluno
        aluno={dados}
        diaPadrao={professor.diaVencimento}
        duracaoPadrao={professor.duracaoAula}
        horarios={await horariosDoAluno(aluno.id)}
        instituicoes={(await listarInstituicoes(professor.id, { situacao: "todas" })).map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
        {...await opcoesDoFormulario(professor, acesso)}
        equipeDoAluno={(await equipePorAluno(professor.id)).get(aluno.id) ?? []}
      />
    </>
  );
}
