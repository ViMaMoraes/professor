import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { TelaAuth } from "@/components/tela-auth";
import { NOME_APP } from "@/lib/marca";

import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin(props: PageProps<"/login">) {
  const { acesso } = await props.searchParams;
  return (
    <TelaAuth titulo={NOME_APP} subtitulo="Escolha como você quer entrar">
      <Suspense>
        <PrimeiroAcesso />
      </Suspense>
      <FormLogin inicial={acesso === "aluno" ? "aluno" : "professor"} />
    </TelaAuth>
  );
}

/** Sem professor cadastrado ainda, manda para a criação de conta. */
async function PrimeiroAcesso() {
  await connection(); // consulta o banco a cada acesso, nunca no build
  if (!(await existeProfessor())) redirect("/configurar");
  return null;
}
