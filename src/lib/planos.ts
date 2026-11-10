/**
 * Planos dos professores clientes. O plano define o limite de alunos ATIVOS (aluno inativo não conta)
 * e se a conta pode ser de estúdio, com equipe. O preço fica fora do sistema (página de apresentação);
 * o tempo de acesso é a data "Acesso até" na Administração. O master não tem limite e pode tudo.
 */

export type Plano = "plus" | "premium" | "estudio";

export const PLANOS: Record<Plano, { nome: string; limiteAlunos: number | null; equipe: boolean; resumo: string }> = {
  plus: { nome: "Plus", limiteAlunos: 5, equipe: false, resumo: "até 5 alunos ativos" },
  premium: { nome: "Premium", limiteAlunos: null, equipe: false, resumo: "alunos ilimitados" },
  estudio: { nome: "Estúdio", limiteAlunos: null, equipe: true, resumo: "alunos ilimitados e equipe" },
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
  return `Seu plano ${nomeDoPlano(professor.plano)} permite até ${limite} alunos ativos. Para cadastrar ou reativar outro aluno, desative um aluno que não tem mais aula ou mude para um plano com alunos ilimitados.`;
}

/** O plano deixa a conta ser de estúdio, com equipe? */
export function planoPermiteEquipe(professor: { plano: string; master: boolean }) {
  return professor.master || PLANOS[planoValido(professor.plano) ? professor.plano : PLANO_PADRAO].equipe;
}

/** Conta funcionando como estúdio agora: escolheu "estúdio" e o plano permite (mudou de plano, a equipe para). */
export function ehEstudio(professor: { tipoConta: string; plano: string; master: boolean }) {
  return professor.tipoConta === "estudio" && planoPermiteEquipe(professor);
}
