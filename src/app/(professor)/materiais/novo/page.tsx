import type { Metadata } from "next";
import { Suspense } from "react";

import { Cabecalho, EsqueletoPagina } from "@/components/ui";
import { exigirProfessor } from "@/lib/auth";
import { listarAlunos } from "@/lib/consultas";

import { FormMaterial } from "../form-material";

export const metadata: Metadata = { title: "Enviar material" };

export default function PaginaNovoMaterial() {
  return (
    <>
      <Cabecalho titulo="Enviar material" />
      <Suspense fallback={<EsqueletoPagina />}>
        <Conteudo />
      </Suspense>
    </>
  );
}

async function Conteudo() {
  await exigirProfessor();
  const alunos = await listarAlunos();
  return <FormMaterial alunos={alunos.map(({ id, nome, instrumento }) => ({ id, nome, instrumento }))} />;
}
