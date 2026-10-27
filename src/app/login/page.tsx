import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { TelaAuth } from "@/components/tela-auth";

import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <TelaAuth titulo="Aula de Música" subtitulo="Área do professor e do aluno">
      <Suspense>
        <PrimeiroAcesso />
      </Suspense>
      <FormLogin />
      <p className="mt-4 text-center text-xs text-suave">Aluno sem acesso? Peça seu login ao professor.</p>
    </TelaAuth>
  );
}

/** Sem professor cadastrado ainda, manda para a criação de conta. */
async function PrimeiroAcesso() {
  if (!(await existeProfessor())) redirect("/configurar");
  return null;
}
