import type { Aluno, Instituicao } from "./db/schema";

export type Pagador = {
  tipo: "aluno" | "instituicao";
  nome: string;
  /** Como aparece em "Recebi de ..." no recibo. */
  recebiDe: string;
  telefone: string | null;
  email: string | null;
};

type AlunoPagador = Pick<Aluno, "nome" | "responsavel" | "telefone" | "email">;
type InstituicaoPagadora = Pick<Instituicao, "nome" | "documento" | "telefone" | "email">;

/** Quem pagou o recibo: a instituição (quando houver) ou o aluno (ou o responsável dele). */
export function pagadorDoRecibo(aluno: AlunoPagador | null, instituicao: InstituicaoPagadora | null): Pagador {
  if (instituicao) {
    return {
      tipo: "instituicao",
      nome: instituicao.nome,
      recebiDe: instituicao.documento ? `${instituicao.nome} (CNPJ/CPF ${instituicao.documento})` : instituicao.nome,
      telefone: instituicao.telefone,
      email: instituicao.email,
    };
  }
  if (!aluno) throw new Error("Recibo sem aluno nem instituição.");
  return {
    tipo: "aluno",
    nome: aluno.nome,
    recebiDe: aluno.responsavel ? `${aluno.responsavel} (responsável por ${aluno.nome})` : aluno.nome,
    telefone: aluno.telefone,
    email: aluno.email,
  };
}
