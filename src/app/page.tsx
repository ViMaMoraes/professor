import { redirect } from "next/navigation";

import { usuarioAtual } from "@/lib/auth";

// "/" leva para o painel (professor), o portal (aluno) ou o login.
export default async function Inicio() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  redirect(usuario.tipo === "professor" ? "/painel" : "/portal");
}
