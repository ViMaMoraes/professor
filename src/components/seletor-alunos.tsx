"use client";

import { CheckSquare, Search, Square } from "lucide-react";
import { useState } from "react";

import { cn, Input, Select } from "./ui";

export type AlunoSelecionavel = { id: number; nome: string; instrumento?: string | null; instituicaoId: number | null };

/**
 * Lista de alunos para marcar (envia os ids marcados no campo `name`).
 * Filtra por nome e por instituição; "Marcar todos" vale só para os alunos que aparecem no filtro,
 * então dá para marcar a instituição inteira e depois desmarcar quem não deve receber.
 */
export function SeletorAlunos({
  alunos,
  instituicoes,
  iniciais = [],
  name = "alunos",
}: {
  alunos: AlunoSelecionavel[];
  instituicoes: { id: number; nome: string }[];
  iniciais?: number[];
  name?: string;
}) {
  const [marcados, setMarcados] = useState(() => new Set(iniciais));
  const [busca, setBusca] = useState("");
  // "" = todas; "particular" = sem instituição; ou o id da instituição
  const [instituicao, setInstituicao] = useState("");

  const nomeInstituicao = new Map(instituicoes.map((i) => [i.id, i.nome]));
  const temParticular = alunos.some((a) => !a.instituicaoId);
  const visiveis = alunos.filter(
    (a) =>
      a.nome.toLowerCase().includes(busca.trim().toLowerCase()) &&
      (instituicao === "" || (instituicao === "particular" ? !a.instituicaoId : String(a.instituicaoId) === instituicao)),
  );
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((a) => marcados.has(a.id));

  function alternar(id: number) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarVisiveis(marcar: boolean) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      for (const a of visiveis) {
        if (marcar) novo.add(a.id);
        else novo.delete(a.id);
      }
      return novo;
    });
  }

  return (
    <div className="rounded-xl border border-borda">
      <div className="flex flex-col gap-2 border-b border-borda p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno..." className="h-9 pl-9" aria-label="Buscar aluno" />
        </div>
        {instituicoes.length > 0 && (
          <Select value={instituicao} onChange={(e) => setInstituicao(e.target.value)} className="h-9 sm:w-56" aria-label="Filtrar por instituição">
            <option value="">Todas as instituições</option>
            {temParticular && <option value="particular">Particulares (sem instituição)</option>}
            {instituicoes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borda px-3 py-2 text-sm">
        <span className="text-suave">
          {marcados.size} {marcados.size === 1 ? "aluno selecionado" : "alunos selecionados"}
        </span>
        {visiveis.length > 0 && (
          <button
            type="button"
            onClick={() => marcarVisiveis(!todosVisiveisMarcados)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-marca-texto hover:bg-marca-suave"
          >
            {todosVisiveisMarcados ? <Square className="size-4" /> : <CheckSquare className="size-4" />}
            {todosVisiveisMarcados ? "Desmarcar" : "Marcar"}{" "}
            {visiveis.length === 1 ? "este aluno" : instituicao === "" && !busca ? "todos" : `os ${visiveis.length} da lista`}
          </button>
        )}
      </div>

      <div className="grid max-h-72 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
        {alunos.length === 0 && <p className="p-2 text-sm text-suave">Nenhum aluno ativo cadastrado.</p>}
        {alunos.length > 0 && visiveis.length === 0 && <p className="p-2 text-sm text-suave">Nenhum aluno neste filtro.</p>}
        {alunos.map((a) => {
          const visivel = visiveis.includes(a);
          return (
            <label
              key={a.id}
              className={cn("flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fundo", !visivel && "hidden")}
            >
              {/* escondido pelo filtro continua marcado e é enviado junto */}
              <input
                type="checkbox"
                name={name}
                value={a.id}
                checked={marcados.has(a.id)}
                onChange={() => alternar(a.id)}
                className="size-4 shrink-0 accent-marca"
              />
              <span className="min-w-0 flex-1 truncate">
                {a.nome}
                {(a.instituicaoId && instituicao === "" ? nomeInstituicao.get(a.instituicaoId) : a.instrumento) && (
                  <span className="ml-1.5 text-xs text-suave">
                    {a.instituicaoId && instituicao === "" ? nomeInstituicao.get(a.instituicaoId) : a.instrumento}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
