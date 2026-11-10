import "server-only";

import { listarMembros } from "@/lib/consultas";
import { podeVer, type Acesso } from "@/lib/permissoes";

/**
 * O que o formulário do aluno mostra para esta pessoa: os valores só com o Financeiro; num estúdio,
 * quem atribui professores (o dono e quem vê todos os alunos) escolhe na lista da equipe.
 */
export async function opcoesDoFormulario(professor: { id: number; tipoConta: string }, acesso: Acesso) {
  const atribui = professor.tipoConta === "estudio" && (acesso.dono || acesso.todosAlunos);
  const equipe = atribui ? (await listarMembros(professor.id)).filter((m) => m.ativo).map((m) => ({ id: m.id, nome: m.nome })) : undefined;
  return { verValores: podeVer(acesso, "financeiro"), equipe };
}
