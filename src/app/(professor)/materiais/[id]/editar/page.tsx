import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarMaterial, listarAlunos } from "@/lib/consultas";

import { FormMaterial } from "../../form-material";

export default function PaginaEditarMaterial(props: PageProps<"/materiais/[id]/editar">) {
  return (
    <>
      <Cabecalho titulo="Editar material" />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo params={props.params} />
      </Suspense>
    </>
  );
}

async function Conteudo({ params }: { params: PageProps<"/materiais/[id]/editar">["params"] }) {
  await exigirProfessor();
  const material = await buscarMaterial(Number((await params).id));
  if (!material) notFound();
  const alunos = await listarAlunos();
  return <FormMaterial material={material} alunos={alunos.map(({ id, nome, instrumento }) => ({ id, nome, instrumento }))} />;
}
