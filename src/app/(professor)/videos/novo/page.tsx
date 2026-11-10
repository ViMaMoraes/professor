import type { Metadata } from "next";

import { Cabecalho, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarInstituicoes, listarModulos } from "@/lib/consultas";

import { FormVideo } from "../form-video";

export const metadata: Metadata = { title: "Adicionar vídeo" };

export default async function PaginaNovoVideo(props: PageProps<"/videos/novo">) {
  const professor = await exigirProfessor("videos");
  const { modulo } = await props.searchParams;
  const [modulos, alunos, instituicoes] = await Promise.all([listarModulos(professor.id), listarAlunos(professor), listarInstituicoes(professor.id)]);
  return (
    <>
      <Voltar href="/videos">Voltar para vídeos</Voltar>
      <Cabecalho titulo="Adicionar vídeo" descricao="Quem tem notificação ativada recebe o aviso de vídeo novo." />
      <FormVideo
        modulos={modulos.map(({ id, nome }) => ({ id, nome }))}
        alunos={alunos.map(({ id, nome, instrumento, instituicaoId }) => ({ id, nome, instrumento, instituicaoId }))}
        instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
        moduloInicial={Number(modulo) || undefined}
      />
    </>
  );
}
