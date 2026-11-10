/**
 * Cursos do aluno no estúdio (sem banco, para poder testar): lê do formulário os cursos (nome, professor)
 * e os horários de cada um, e diz o que gravar.
 */

import { DURACOES, horaValida } from "./agenda";

export type CursoEnviado = { chave: string; id: number | null; nome: string; membroId: number | null };
export type HorarioEnviado = { diaSemana: number; hora: string | null; duracaoMin: number | null; cursoChave: string };

/** Lê os campos do EditorCursos (cursoChave, cursoId, cursoNome, cursoMembro e os horários com horarioCurso). */
export function lerCursosDoFormulario(dados: FormData): { cursos: CursoEnviado[]; horarios: HorarioEnviado[] } {
  const ids = dados.getAll("cursoId").map(String);
  const nomes = dados.getAll("cursoNome").map(String);
  const membros = dados.getAll("cursoMembro").map(String);
  const cursos = dados
    .getAll("cursoChave")
    .map(String)
    .map((chave, i) => ({
      chave,
      id: Number(ids[i]) || null,
      nome: (nomes[i] ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
      // 0 ou vazio = o dono da conta
      membroId: Number(membros[i]) || null,
    }))
    .slice(0, 10);
  const chaves = new Set(cursos.map((c) => c.chave));
  const horas = dados.getAll("horarioHora").map(String);
  const duracoes = dados.getAll("horarioDuracao").map(Number);
  const deQual = dados.getAll("horarioCurso").map(String);
  const horarios = dados
    .getAll("horarioDia")
    .map((dia, i) => ({
      diaSemana: Number(dia),
      hora: horaValida(horas[i]) ? horas[i] : null,
      duracaoMin: DURACOES.includes(duracoes[i]) ? duracoes[i] : null,
      cursoChave: deQual[i] ?? "",
    }))
    .filter((h) => Number.isInteger(h.diaSemana) && h.diaSemana >= 0 && h.diaSemana <= 6 && chaves.has(h.cursoChave))
    .slice(0, 30);
  return { cursos, horarios };
}

/** "Piano, Teoria" para o campo de curso do aluno (listas, recibo), sem repetir. */
export function resumoDosCursos(nomes: string[]) {
  return [...new Set(nomes.filter(Boolean))].join(", ") || null;
}
