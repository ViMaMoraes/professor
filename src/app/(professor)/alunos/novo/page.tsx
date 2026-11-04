import type { Metadata } from "next";

import { Cabecalho, Voltar } from "@/components/ui";
import { UsoDoPlano } from "@/components/uso-do-plano";
import { exigirProfessor } from "@/lib/auth";
import { listarInstituicoes } from "@/lib/consultas";

import { FormAluno } from "../form-aluno";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function PaginaNovoAluno() {
  const professor = await exigirProfessor();
  const instituicoes = await listarInstituicoes(professor.id);
  return (
    <>
      <Voltar href="/alunos">Voltar para alunos</Voltar>
      <Cabecalho titulo="Novo aluno" />
      <UsoDoPlano professor={professor} />
      <FormAluno instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))} diaPadrao={professor.diaVencimento} duracaoPadrao={professor.duracaoAula} />
    </>
  );
}
