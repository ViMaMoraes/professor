import "server-only";

import type { ComponentProps } from "react";

import { cursosDaConta, equipePorAluno, horariosDoAluno, listarMembros } from "@/lib/consultas";
import type { Membro } from "@/lib/db/schema";
import { listaDeCursos, podeVer, type Acesso } from "@/lib/permissoes";
import { ehEstudio } from "@/lib/planos";

import type { EditorCursos } from "./editor-cursos";

type Conta = { id: number; nome: string; tipoConta: string; plano: string; master: boolean };

/**
 * O que o formulário do aluno mostra para esta pessoa: os valores só com o Financeiro; no estúdio, os cursos
 * do aluno (cada um com professor e horários). Quem atribui (dono ou quem vê todos os alunos) escolhe curso e
 * professor; o professor da equipe só cuida dos cursos dele, e o curso vem do cadastro dele.
 */
export async function opcoesDoFormulario(
  professor: Conta,
  acesso: Acesso,
  membro: Membro | null,
  aluno?: { id: number; instrumento: string | null },
) {
  const verValores = podeVer(acesso, "financeiro");
  if (!ehEstudio(professor)) return { verValores };

  const modo: "atribui" | "restrito" = acesso.dono || acesso.todosAlunos ? "atribui" : "restrito";
  const equipe = (await listarMembros(professor.id)).filter((m) => m.ativo);
  const professores = [
    { id: 0, nome: acesso.dono ? `${professor.nome} (você)` : professor.nome, cursos: [] as string[] },
    ...equipe.map((m) => ({ id: m.id, nome: m.nome, cursos: listaDeCursos(m.cursos) })),
  ];
  const meusCursos = listaDeCursos(membro?.cursos);
  const nomeDe = (membroId: number | null) =>
    membroId ? (equipe.find((m) => m.id === membroId)?.nome ?? "outro professor") : professor.nome;

  type Inicial = ComponentProps<typeof EditorCursos>["iniciais"][number];
  let iniciais: Inicial[];
  if (aluno) {
    // todos os cursos do aluno (o professor da equipe vê os dos outros, mas não muda)
    const [cursos, horarios, porAluno] = await Promise.all([
      cursosDaConta(professor.id, { alunoId: aluno.id }),
      horariosDoAluno(aluno.id),
      equipePorAluno(professor.id),
    ]);
    const semCurso = horarios.filter((h) => !h.cursoId);
    iniciais = cursos.map((c, i) => ({
      id: c.id,
      nome: c.nome,
      membroId: c.membroId ?? 0,
      // horários antigos, de antes dos cursos, entram no primeiro curso para não se perderem
      horarios: [...horarios.filter((h) => h.cursoId === c.id), ...(i === 0 ? semCurso : [])],
      somenteLeitura: modo === "restrito" && c.membroId !== membro?.id,
      professorNome: nomeDe(c.membroId),
    }));
    if (cursos.length === 0 && (aluno.instrumento || horarios.length)) {
      // aluno de antes dos cursos: vira um curso com o curso e os horários que já tinha
      const primeiroDaEquipe = porAluno.get(aluno.id)?.[0] ?? 0;
      iniciais = [
        {
          id: null,
          nome: aluno.instrumento ?? (modo === "restrito" ? (meusCursos[0] ?? "") : ""),
          membroId: modo === "restrito" ? 0 : primeiroDaEquipe,
          horarios,
        },
      ];
    }
  } else {
    // aluno novo: um curso já aberto (no professor da equipe, o curso dele)
    const membroId = equipe[0]?.id ?? 0;
    iniciais = [
      {
        id: null,
        nome: modo === "restrito" ? (meusCursos[0] ?? "") : equipe[0] ? (listaDeCursos(equipe[0].cursos)[0] ?? "") : "",
        membroId,
        horarios: [],
      },
    ];
  }
  return { verValores, estudio: { modo, iniciais, professores, meusCursos } };
}
