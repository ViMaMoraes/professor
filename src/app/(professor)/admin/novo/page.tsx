import type { Metadata } from "next";

import { Cabecalho } from "@/components/ui";
import { exigirMaster } from "@/lib/auth";

import { FormProfessor } from "../form-professor";

export const metadata: Metadata = { title: "Novo professor" };

export default async function PaginaNovoProfessor() {
  await exigirMaster();
  return (
    <>
      <Cabecalho titulo="Novo professor" descricao="Crie a conta e envie o e-mail e a senha inicial para o professor entrar." />
      <FormProfessor />
    </>
  );
}
