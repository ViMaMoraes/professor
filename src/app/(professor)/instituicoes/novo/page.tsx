import type { Metadata } from "next";

import { Cabecalho, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";

import { FormInstituicao } from "../form-instituicao";
import { opcoesDeAlunos } from "../opcoes-alunos";

export const metadata: Metadata = { title: "Nova instituição" };

export default async function PaginaNovaInstituicao() {
  const professor = await exigirProfessor();
  return (
    <>
      <Voltar href="/instituicoes">Voltar para instituições</Voltar>
      <Cabecalho titulo="Nova instituição" descricao="Escola, igreja, projeto social ou família que paga por vários alunos." />
      <FormInstituicao alunos={await opcoesDeAlunos(professor.id)} />
    </>
  );
}
