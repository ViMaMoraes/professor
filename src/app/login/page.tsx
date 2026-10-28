import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { TelaAuth } from "@/components/tela-auth";
import { migracoesPendentes } from "@/lib/db";
import { NOME_APP } from "@/lib/marca";
import { normalizarUsuario } from "@/lib/usuario";

import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin(props: PageProps<"/login">) {
  const { acesso, usuario } = await props.searchParams;
  await connection();
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} paraAluno={acesso === "aluno"} />;
  return (
    <TelaAuth titulo={NOME_APP} subtitulo="Escolha como você quer entrar">
      <Suspense>
        <PrimeiroAcesso />
      </Suspense>
      <FormLogin
        inicial={acesso === "aluno" ? "aluno" : "professor"}
        usuarioInicial={typeof usuario === "string" ? normalizarUsuario(usuario) : undefined}
      />
    </TelaAuth>
  );
}

/** Sem professor cadastrado ainda, manda para a criação de conta. */
async function PrimeiroAcesso() {
  await connection(); // consulta o banco a cada acesso, nunca no build
  if (!(await existeProfessor())) redirect("/configurar");
  return null;
}
