import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecalho, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { buscarVideo, listarAlunos, listarInstituicoes, listarModulos } from "@/lib/consultas";

import { FormVideo } from "../../form-video";

export const metadata: Metadata = { title: "Editar vídeo" };

export default async function PaginaEditarVideo(props: PageProps<"/videos/[id]/editar">) {
  const professor = await exigirProfessor();
  const id = Number((await props.params).id);
  const [dados, modulos, alunos, instituicoes] = await Promise.all([
    buscarVideo(professor.id, id),
    listarModulos(professor.id),
    listarAlunos(professor.id),
    listarInstituicoes(professor.id),
  ]);
  if (!dados) notFound();
  return (
    <>
      <Voltar href={`/videos/${id}`}>Voltar para o vídeo</Voltar>
      <Cabecalho titulo="Editar vídeo" />
      <FormVideo
        video={{ ...dados.video, alunoIds: dados.alunoIds }}
        modulos={modulos.map(({ id: mid, nome }) => ({ id: mid, nome }))}
        alunos={alunos.map(({ id: aid, nome, instrumento, instituicaoId }) => ({ id: aid, nome, instrumento, instituicaoId }))}
        instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
      />
    </>
  );
}
