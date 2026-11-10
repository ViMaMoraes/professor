import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Cabecalho, Voltar } from "@/components/ui";
import { exigirDono } from "@/lib/auth";
import { enderecoSite } from "@/lib/endereco";

import { FormNovoMembro } from "../form-membro";
import { ehEstudio } from "@/lib/planos";

export const metadata: Metadata = { title: "Adicionar à equipe" };

export default async function PaginaNovoMembro() {
  const professor = await exigirDono();
  if (!ehEstudio(professor)) redirect("/equipe");
  return (
    <>
      <Voltar href="/equipe">Voltar para a equipe</Voltar>
      <Cabecalho titulo="Adicionar à equipe" descricao="Professor ou coordenação, com o que cada um pode ver." />
      <FormNovoMembro endereco={enderecoSite()} />
    </>
  );
}
