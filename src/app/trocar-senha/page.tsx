import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TelaAuth } from "@/components/tela-auth";
import { usuarioAtual } from "@/lib/auth";
import { primeiroNome } from "@/lib/formato";

import { FormTrocarSenha } from "./form-trocar-senha";

export const metadata: Metadata = { title: "Criar senha" };

/** Primeiro acesso com a senha provisória gerada pelo administrador. */
export default async function PaginaTrocarSenha() {
  const usuario = await usuarioAtual();
  if (usuario?.tipo !== "professor") redirect("/login");
  const pessoa = usuario.membro ?? usuario.professor;
  if (!pessoa.trocarSenha) redirect("/painel");
  return (
    <TelaAuth
      titulo={`Olá, ${primeiroNome(pessoa.nome)}!`}
      subtitulo="Você entrou com uma senha provisória. Crie a sua senha para continuar."
    >
      <FormTrocarSenha email={pessoa.email} />
    </TelaAuth>
  );
}
