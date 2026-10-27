import { redirect } from "next/navigation";

// Endereço curto para passar aos alunos: /aluno abre o login já na aba "Acesso aluno".
export default function AcessoAluno() {
  redirect("/login?acesso=aluno");
}
