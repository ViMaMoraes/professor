import type { Metadata } from "next";

import { Cabecalho, Voltar } from "@/components/ui";
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
      <FormAluno instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))} />
    </>
  );
}
