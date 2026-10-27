import type { Metadata } from "next";

import { Cabecalho } from "@/components/ui";

import { FormAluno } from "../form-aluno";

export const metadata: Metadata = { title: "Novo aluno" };

export default function PaginaNovoAluno() {
  return (
    <>
      <Cabecalho titulo="Novo aluno" />
      <FormAluno />
    </>
  );
}
