/**
 * Planos dos professores clientes. O plano define só o limite de alunos ATIVOS (aluno inativo não conta);
 * o tempo de acesso é controlado pela data "Acesso até" na Administração. O master não tem limite.
 */

export type Plano = "plus" | "premium";

export const PLANOS: Record<Plano, { nome: string; limiteAlunos: number | null }> = {
  plus: { nome: "Plus", limiteAlunos: 5 },
  premium: { nome: "Premium", limiteAlunos: null },
};

export const PLANO_PADRAO: Plano = "premium";

export function planoValido(valor: unknown): valor is Plano {
  return typeof valor === "string" && Object.hasOwn(PLANOS, valor);
}

/** Nome do plano para mostrar na tela (valor desconhecido vale como o padrão). */
export function nomeDoPlano(plano: string) {
  return PLANOS[planoValido(plano) ? plano : PLANO_PADRAO].nome;
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
  return `Seu plano ${nomeDoPlano(professor.plano)} permite até ${limite} alunos ativos. Para cadastrar ou reativar outro aluno, desative um aluno que não tem mais aula ou mude para o plano Premium (alunos ilimitados).`;
}
