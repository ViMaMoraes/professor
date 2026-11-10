import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { existeProfessor } from "@/app/acoes/auth";
import { BancoDesatualizado } from "@/components/banco-desatualizado";
import { TelaAuth } from "@/components/tela-auth";
import { migracoesPendentes } from "@/lib/db";
import { NOME_APP } from "@/lib/marca";
import { normalizarCodigo, normalizarUsuario } from "@/lib/usuario";

import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin(props: PageProps<"/login">) {
  const { acesso, usuario, professor, link } = await props.searchParams;
  await connection();
  const pendentes = await migracoesPendentes();
  if (pendentes.length) return <BancoDesatualizado pendentes={pendentes} paraAluno={acesso === "aluno"} />;
  return (
    <TelaAuth titulo={NOME_APP} subtitulo="Escolha como você quer entrar">
      <Suspense>
        <PrimeiroAcesso />
      </Suspense>
      {link === "invalido" && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Esse link de acesso não vale mais. Peça um link novo ao seu professor ou entre com o seu usuário.
        </p>
      )}
      <FormLogin
        inicial={acesso === "aluno" ? "aluno" : "professor"}
        usuarioInicial={typeof usuario === "string" ? normalizarUsuario(usuario) : undefined}
        codigoInicial={typeof professor === "string" ? normalizarCodigo(professor) : undefined}
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
