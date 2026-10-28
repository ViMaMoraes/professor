import type { Metadata } from "next";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina, Voltar } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos, listarInstituicoes } from "@/lib/consultas";

import { FormMaterial } from "../form-material";

export const metadata: Metadata = { title: "Adicionar material" };

export default function PaginaNovoMaterial() {
  return (
    <>
      <Voltar href="/materiais">Voltar para downloads</Voltar>
      <Cabecalho
        titulo="Adicionar material"
        descricao="O arquivo fica no seu Google Drive; aqui você só cola o link e escolhe quem pode acessar."
      />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  const professor = await exigirProfessor();
  const [alunos, instituicoes] = await Promise.all([listarAlunos(professor.id), listarInstituicoes(professor.id)]);
  return (
    <FormMaterial
      alunos={alunos.map(({ id, nome, instrumento, instituicaoId }) => ({ id, nome, instrumento, instituicaoId }))}
      instituicoes={instituicoes.map(({ instituicao: i }) => ({ id: i.id, nome: i.nome }))}
    />
  );
}
