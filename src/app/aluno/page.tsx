import { redirect } from "next/navigation";

import { normalizarCodigo, normalizarUsuario } from "@/lib/usuario";

// Endereço curto para passar aos alunos: /aluno abre o login já na aba "Acesso aluno".
// O link pessoal (copiado na página do aluno) traz ?p=código do professor&u=usuario, que já vêm preenchidos.
// Links antigos, só com ?u=, continuam funcionando.
export default async function AcessoAluno(props: PageProps<"/aluno">) {
  const { u, p } = await props.searchParams;
  const usuario = typeof u === "string" ? normalizarUsuario(u) : "";
  const codigo = typeof p === "string" ? normalizarCodigo(p) : "";
  const busca = new URLSearchParams({ acesso: "aluno" });
  if (usuario) busca.set("usuario", usuario);
  if (codigo) busca.set("professor", codigo);
  redirect(`/login?${busca}`);
}
