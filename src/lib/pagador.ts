import type { Aluno, Instituicao } from "./db/schema";

export type Pagador = {
  tipo: "aluno" | "instituicao";
  nome: string;
  /** Como aparece depois de "recebi" no recibo, já com a preposição: "da Igreja X", "de Marina, responsável por Carla,". */
  recebiDe: string;
  /** O que foi pago, configurado no cadastro (ex.: "às aulas de violino"). */
  descricao: string | null;
  telefone: string | null;
  email: string | null;
};

type AlunoPagador = Pick<Aluno, "nome" | "responsavel" | "telefone" | "email"> & { descricaoRecibo?: string | null };
type InstituicaoPagadora = Pick<Instituicao, "nome" | "documento" | "telefone" | "email"> & {
  tratamento?: string | null;
  descricaoRecibo?: string | null;
};

export const TRATAMENTOS = ["da", "do", "de"] as const;

/** Quem pagou o recibo: a instituição (quando houver) ou o aluno (ou o responsável dele). */
export function pagadorDoRecibo(aluno: AlunoPagador | null, instituicao: InstituicaoPagadora | null): Pagador {
  if (instituicao) {
    const preposicao = TRATAMENTOS.includes(instituicao.tratamento as never) ? instituicao.tratamento : "de";
    return {
      tipo: "instituicao",
      nome: instituicao.nome,
      recebiDe: `${preposicao} ${instituicao.nome}${instituicao.documento ? ` (CNPJ/CPF ${instituicao.documento})` : ""}`,
      descricao: instituicao.descricaoRecibo ?? null,
      telefone: instituicao.telefone,
      email: instituicao.email,
    };
  }
  if (!aluno) throw new Error("Recibo sem aluno nem instituição.");
  return {
    tipo: "aluno",
    nome: aluno.nome,
    recebiDe: aluno.responsavel ? `de ${aluno.responsavel}, responsável por ${aluno.nome},` : `de ${aluno.nome}`,
    descricao: aluno.descricaoRecibo ?? null,
    telefone: aluno.telefone,
    email: aluno.email,
  };
}

/** "às aulas de violino" → "referente às aulas de violino"; "aulas de violino" → "referente a aulas de violino". */
export function referenteA(descricao: string) {
  const texto = descricao.trim();
  return /^(a|à|às|ao|aos)\s/i.test(texto) ? `referente ${texto}` : `referente a ${texto}`;
}
