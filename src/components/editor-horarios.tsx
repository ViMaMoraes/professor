"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { DIAS_LONGOS, DURACOES } from "@/lib/agenda";

import { Botao, Input, Select } from "./ui";

type Linha = { chave: number; diaSemana: number; hora: string; duracaoMin: number | null };
// segunda primeiro, domingo por último
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Horários fixos de aula do aluno (um por linha): dia, hora e duração. `curso`: chave do curso dono destes horários (estúdio). */
export function EditorHorarios({
  iniciais,
  duracaoPadrao,
  curso,
}: {
  iniciais: { diaSemana: number; hora: string | null; duracaoMin: number | null }[];
  duracaoPadrao: number;
  curso?: string;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => iniciais.map((h, i) => ({ chave: i, ...h, hora: h.hora ?? "" })));
  const [proxima, setProxima] = useState(iniciais.length);

  const mudar = (chave: number, campo: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...campo } : l)));
  function adicionar() {
    // sugere o mesmo horário da última linha (ex.: segunda e quarta às 18:00)
    const ultima = linhas.at(-1);
    setLinhas((ls) => [...ls, { chave: proxima, diaSemana: ultima ? (ultima.diaSemana + 2) % 7 : 1, hora: ultima?.hora ?? "", duracaoMin: ultima?.duracaoMin ?? null }]);
    setProxima((n) => n + 1);
  }

  return (
    <div className="space-y-2">
      {linhas.length === 0 && <p className="text-sm text-suave">Sem horário fixo. Adicione os dias e horários das aulas deste aluno.</p>}
      {linhas.map((l) => (
        <div key={l.chave} className="flex flex-wrap items-center gap-2">
          {curso !== undefined && <input type="hidden" name="horarioCurso" value={curso} />}
          <Select name="horarioDia" value={l.diaSemana} onChange={(e) => mudar(l.chave, { diaSemana: Number(e.target.value) })} className="w-36" aria-label="Dia">
            {ORDEM_DIAS.map((d) => (
              <option key={d} value={d}>
                {DIAS_LONGOS[d]}
              </option>
            ))}
          </Select>
          <Input type="time" name="horarioHora" value={l.hora} onChange={(e) => mudar(l.chave, { hora: e.target.value })} className="w-32" aria-label="Horário" />
          <Select
            name="horarioDuracao"
            value={l.duracaoMin ?? ""}
            onChange={(e) => mudar(l.chave, { duracaoMin: Number(e.target.value) || null })}
            className="w-40"
            aria-label="Duração"
          >
            <option value="">Padrão ({duracaoPadrao} min)</option>
            {DURACOES.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
            className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-red-600"
            aria-label="Remover horário"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <Botao type="button" variante="secundario" tamanho="sm" onClick={adicionar}>
        <Plus /> Adicionar horário
      </Botao>
    </div>
  );
}
