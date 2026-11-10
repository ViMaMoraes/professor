"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { EditorHorarios } from "@/components/editor-horarios";
import { Botao, Campo, Input, Select } from "@/components/ui";
import { resumoHorarios } from "@/lib/agenda";

type Horario = { diaSemana: number; hora: string | null; duracaoMin: number | null };

export type CursoInicial = {
  id: number | null;
  nome: string;
  /** professor da equipe; 0 = o dono da conta */
  membroId: number;
  horarios: Horario[];
  /** curso de outro professor, visto por quem só cuida dos próprios: aparece, mas não muda */
  somenteLeitura?: boolean;
  professorNome?: string;
};

/** `nomeSugerido`: o nome veio do que o professor ensina e ninguém mexeu (trocar o professor troca o nome). */
type Curso = CursoInicial & { chave: string; nomeSugerido?: boolean };

/**
 * Cursos do aluno numa conta de estúdio (ex.: Piano com a Paula, Teoria com a Carla), cada um com os seus horários.
 * - "atribui" (dono ou coordenação): escreve o curso e escolhe o professor;
 * - "restrito" (professor da equipe): o professor é ele e o curso vem do cadastro dele (do que dá aula).
 */
export function EditorCursos({
  modo,
  iniciais,
  professores = [],
  meusCursos = [],
  duracaoPadrao,
}: {
  modo: "atribui" | "restrito";
  iniciais: CursoInicial[];
  /** quem pode dar aula (0 = o dono), com o que cada um ensina, para sugerir o nome do curso */
  professores?: { id: number; nome: string; cursos: string[] }[];
  /** do que o professor da equipe dá aula (modo restrito) */
  meusCursos?: string[];
  duracaoPadrao: number;
}) {
  const [cursos, setCursos] = useState<Curso[]>(() => iniciais.map((c, i) => ({ ...c, chave: `c${i}`, nomeSugerido: !c.id })));
  const [proxima, setProxima] = useState(iniciais.length);
  const mudar = (chave: string, campo: Partial<Curso>) => setCursos((cs) => cs.map((c) => (c.chave === chave ? { ...c, ...campo } : c)));

  function adicionar() {
    const membroId = modo === "atribui" ? (professores[0]?.id ?? 0) : 0;
    const sugerido = modo === "restrito" ? (meusCursos[0] ?? "") : (professores.find((p) => p.id === membroId)?.cursos[0] ?? "");
    setCursos((cs) => [...cs, { chave: `c${proxima}`, id: null, nome: sugerido, membroId, horarios: [], nomeSugerido: true }]);
    setProxima((n) => n + 1);
  }

  return (
    <div className="space-y-3">
      {cursos.length === 0 && <p className="text-sm text-suave">Nenhum curso ainda. Adicione o curso, o professor e os horários.</p>}
      {cursos.map((c) =>
        c.somenteLeitura ? (
          <div key={c.chave} className="rounded-xl border border-dashed border-borda px-4 py-3 text-sm">
            <span className="font-medium">{c.nome}</span>
            <span className="text-suave">
              {c.professorNome && ` com ${c.professorNome}`}
              {c.horarios.length > 0 && ` · ${resumoHorarios(c.horarios)}`}
            </span>
            <p className="text-xs text-suave">Curso de outro professor: só quem atribui os cursos muda.</p>
          </div>
        ) : (
          <div key={c.chave} className="space-y-3 rounded-xl border border-borda p-4">
            <input type="hidden" name="cursoChave" value={c.chave} />
            <input type="hidden" name="cursoId" value={c.id ?? ""} />
            <div className="flex flex-wrap items-end gap-3">
              {modo === "atribui" ? (
                <>
                  <Campo rotulo="Curso / matéria *" className="min-w-48 flex-1">
                    <Input
                      name="cursoNome"
                      required
                      value={c.nome}
                      onChange={(e) => mudar(c.chave, { nome: e.target.value, nomeSugerido: false })}
                      list={`cursos-${c.chave}`}
                      placeholder="ex.: Piano"
                      maxLength={60}
                    />
                    {/* sugestões: só do que o professor escolhido ensina (nada de lista pronta) */}
                    <datalist id={`cursos-${c.chave}`}>
                      {(professores.find((p) => p.id === c.membroId)?.cursos ?? []).map((nome) => (
                        <option key={nome} value={nome} />
                      ))}
                    </datalist>
                  </Campo>
                  <Campo rotulo="Professor" className="min-w-48 flex-1">
                    <Select
                      name="cursoMembro"
                      value={c.membroId}
                      onChange={(e) => {
                        const membroId = Number(e.target.value);
                        // curso ainda em branco: já vem do que esse professor ensina
                        const sugerido = professores.find((p) => p.id === membroId)?.cursos[0];
                        mudar(c.chave, { membroId, nome: c.nomeSugerido || !c.nome ? (sugerido ?? "") : c.nome, nomeSugerido: c.nomeSugerido || !c.nome });
                      }}
                    >
                      {professores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                </>
              ) : meusCursos.length > 1 ? (
                <Campo rotulo="Curso" className="min-w-48 flex-1">
                  <Select name="cursoNome" value={c.nome} onChange={(e) => mudar(c.chave, { nome: e.target.value })}>
                    {[...new Set([...meusCursos, ...(c.nome ? [c.nome] : [])])].map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </Select>
                </Campo>
              ) : meusCursos.length === 1 ? (
                <div className="min-w-48 flex-1 text-sm">
                  <input type="hidden" name="cursoNome" value={c.nome || meusCursos[0]} />
                  <span className="text-suave">Curso: </span>
                  <span className="font-medium">{c.nome || meusCursos[0]}</span>
                </div>
              ) : (
                <Campo
                  rotulo="Curso / matéria *"
                  dica="Peça ao responsável para preencher “Dá aula de” no seu cadastro."
                  className="min-w-48 flex-1"
                >
                  <Input
                    name="cursoNome"
                    required
                    value={c.nome}
                    onChange={(e) => mudar(c.chave, { nome: e.target.value })}
                    maxLength={60}
                  />
                </Campo>
              )}
              {modo === "restrito" && <input type="hidden" name="cursoMembro" value="" />}
              <button
                type="button"
                onClick={() => setCursos((cs) => cs.filter((x) => x.chave !== c.chave))}
                className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-red-600"
                aria-label={`Tirar o curso ${c.nome}`}
                title="Tirar este curso"
              >
                <X className="size-4" />
              </button>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Horários</p>
              <EditorHorarios iniciais={c.horarios} duracaoPadrao={duracaoPadrao} curso={c.chave} />
            </div>
          </div>
        ),
      )}
      <Botao type="button" variante="secundario" tamanho="sm" onClick={adicionar}>
        <Plus /> Adicionar curso
      </Botao>
    </div>
  );
}
