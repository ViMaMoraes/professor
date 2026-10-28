import type { Metadata } from "next";

import { Cabecalho } from "@/components/ui";
import { exigirMaster } from "@/lib/auth";
import { enderecoSite } from "@/lib/endereco";

import { FormNovoProfessor } from "../form-professor";

export const metadata: Metadata = { title: "Novo professor" };

export default async function PaginaNovoProfessor() {
  await exigirMaster();
  return (
    <>
      <Cabecalho titulo="Novo professor" descricao="O site gera uma senha provisória; o professor cria a dele no primeiro acesso." />
      <FormNovoProfessor endereco={enderecoSite()} />
    </>
  );
}
