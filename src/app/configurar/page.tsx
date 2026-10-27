import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { TelaAuth } from "@/components/tela-auth";
import { Esqueleto } from "@/components/ui";
import { migracoesPendentes } from "@/lib/db";

import { FormCriarConta } from "./form-criar-conta";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default async function PaginaConfigurar() {
  await connection();
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} />;
  return (
    <TelaAuth titulo="Bem-vindo!" subtitulo="Crie sua conta de professor para começar.">
      <Suspense fallback={<Esqueleto className="h-80" />}>
        <Conteudo />
      </Suspense>
    </TelaAuth>
  );
}

async function Conteudo() {
  await connection(); // consulta o banco a cada acesso, nunca no build
  if (await existeProfessor()) redirect("/login");
  return <FormCriarConta />;
}
