import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { TelaAuth } from "@/components/tela-auth";
import { Esqueleto } from "@/components/ui";

import { FormCriarConta } from "./form-criar-conta";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default function PaginaConfigurar() {
  return (
    <TelaAuth titulo="Bem-vindo! 🎵" subtitulo="Crie sua conta de professor para começar.">
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
