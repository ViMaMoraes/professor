import "server-only";

import { listarAlunos, listarInstituicoes } from "@/lib/consultas";

/** Alunos do professor para marcar no formulário da instituição. */
export async function opcoesDeAlunos(professorId: number, instituicaoId?: number) {
  const [alunos, instituicoes] = await Promise.all([listarAlunos(professorId), listarInstituicoes(professorId, { situacao: "todas" })]);
  const nomes = new Map(instituicoes.map(({ instituicao: i }) => [i.id, i.nome]));
  return alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    instrumento: a.instrumento,
    marcado: instituicaoId !== undefined && a.instituicaoId === instituicaoId,
    outraInstituicao: a.instituicaoId && a.instituicaoId !== instituicaoId ? (nomes.get(a.instituicaoId) ?? null) : null,
  }));
}
