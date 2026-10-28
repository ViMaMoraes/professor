import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarMaterial, listarAlunos, listarInstituicoes } from "@/lib/consultas";

import { FormMaterial } from "../../form-material";

export default function PaginaEditarMaterial(props: PageProps<"/materiais/[id]/editar">) {
  return (
    <>
      <Voltar href="/materiais">Voltar para downloads</Voltar>
      <Cabecalho titulo="Editar material" />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo params={props.params} />
      </Suspense>
    </>
  );
}

async function Conteudo({ params }: { params: PageProps<"/materiais/[id]/editar">["params"] }) {
  const professor = await exigirProfessor();
  const material = await buscarMaterial(professor.id, Number((await params).id));
  if (!material) notFound();
  const [alunos, instituicoes] = await Promise.all([listarAlunos(professor.id), listarInstituicoes(professor.id)]);
  return (
    <FormMaterial
      material={material}
      alunos={alunos.map(({ id, nome, instrumento, instituicaoId }) => ({ id, nome, instrumento, instituicaoId }))}
      instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
    />
  );
}
