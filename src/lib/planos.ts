/**
 * Planos de assinatura dos professores clientes. O plano define o limite de alunos ATIVOS
 * (aluno inativo não conta). O master não tem limite.
 */

export type Plano = "iniciante" | "completo" | "anual";

export const PLANOS: Record<Plano, { nome: string; preco: string; limiteAlunos: number | null }> = {
  iniciante: { nome: "Iniciante", preco: "R$ 39,90/mês", limiteAlunos: 5 },
  completo: { nome: "Completo", preco: "R$ 69,90/mês", limiteAlunos: null },
  anual: { nome: "Anual", preco: "R$ 699,90/ano", limiteAlunos: null },
};

export const PLANO_PADRAO: Plano = "completo";

export function planoValido(valor: unknown): valor is Plano {
  return typeof valor === "string" && valor in PLANOS;
}

/** Limite de alunos ativos do professor (null = ilimitado). */
export function limiteDeAlunos(professor: { plano: string; master: boolean }) {
  if (professor.master) return null;
  return PLANOS[planoValido(professor.plano) ? professor.plano : PLANO_PADRAO].limiteAlunos;
}

/** Ainda cabe mais um aluno ativo? */
export function cabeMaisUmAluno(professor: { plano: string; master: boolean }, ativos: number) {
  const limite = limiteDeAlunos(professor);
  return limite == null || ativos < limite;
}

/** Mensagem para quem chegou no limite do plano. */
export function textoLimiteAtingido(professor: { plano: string }, limite: number) {
  const nome = PLANOS[planoValido(professor.plano) ? professor.plano : PLANO_PADRAO].nome;
  return `Seu plano ${nome} permite até ${limite} alunos ativos. Para cadastrar ou reativar outro aluno, desative um aluno que não tem mais aula ou mude para o plano Completo (alunos ilimitados).`;
}
