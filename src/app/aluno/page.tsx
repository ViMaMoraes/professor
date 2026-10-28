import { redirect } from "next/navigation";

import { normalizarUsuario } from "@/lib/usuario";

// Endereço curto para passar aos alunos: /aluno abre o login já na aba "Acesso aluno".
// Com ?u=usuario (o link que o professor copia na página do aluno), o usuário já vem preenchido.
export default async function AcessoAluno(props: PageProps<"/aluno">) {
  const { u } = await props.searchParams;
  const usuario = typeof u === "string" ? normalizarUsuario(u) : "";
  redirect(usuario ? `/login?acesso=aluno&usuario=${encodeURIComponent(usuario)}` : "/login?acesso=aluno");
}
