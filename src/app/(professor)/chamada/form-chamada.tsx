"use client";

import { Check, CheckCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { salvarChamada } from "@/app/acoes/chamada";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Botao, Card, cn, Input, Vazio } from "@/components/ui";
import { STATUS_PRESENCA } from "@/lib/constantes";

type Linha = { id: number; nome: string; detalhe: string; status: string; observacao: string };

const OPCOES = [
  { valor: "presente", cor: "peer-checked:bg-emerald-600 peer-checked:border-emerald-600" },
  { valor: "falta", cor: "peer-checked:bg-red-600 peer-checked:border-red-600" },
  { valor: "justificada", cor: "peer-checked:bg-amber-500 peer-checked:border-amber-500" },
  { valor: "reposicao", cor: "peer-checked:bg-sky-600 peer-checked:border-sky-600" },
  { valor: "", cor: "peer-checked:bg-zinc-500 peer-checked:border-zinc-500" },
] as const;

export function FormChamada({
  data,
  diaSemana,
  alunos,
  linkTodos,
}: {
  data: string;
  diaSemana: string;
  alunos: Linha[];
  linkTodos: string;
}) {
  const [status, setStatus] = useState<Record<number, string>>(() =>
    Object.fromEntries(alunos.map((a) => [a.id, a.status])),
  );

  if (alunos.length === 0) {
    return (
      <Card>
        <Vazio icone={<Users />} titulo={`Nenhum aluno com aula ${diaSemana === "Sábado" || diaSemana === "Domingo" ? "no" : "na"} ${diaSemana.toLowerCase()}`}>
          <Link href={linkTodos} className="text-marca-texto hover:underline">
            Mostrar todos os alunos ativos
          </Link>
        </Vazio>
      </Card>
    );
  }

  return (
    <Formulario acao={salvarChamada}>
      <input type="hidden" name="data" value={data} />
      <Card className="divide-y divide-borda">
        {alunos.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <input type="hidden" name="alunos" value={a.id} />
            <div className="min-w-0 md:w-52">
              <p className="truncate font-medium">{a.nome}</p>
              <p className="truncate text-xs text-suave">{a.detalhe}</p>
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={`Situação de ${a.nome}`}>
              {OPCOES.map((op) => {
                const info = op.valor ? STATUS_PRESENCA[op.valor] : { sigla: "–", nome: "Sem registro" };
                return (
                  <label key={op.valor} title={info.nome} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`status_${a.id}`}
                      value={op.valor}
                      checked={status[a.id] === op.valor}
                      onChange={() => setStatus((s) => ({ ...s, [a.id]: op.valor }))}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-lg border border-borda px-2 text-sm font-semibold text-suave transition-colors hover:bg-fundo",
                        "peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-marca/40",
                        op.cor,
                      )}
                    >
                      {info.sigla}
                    </span>
                  </label>
                );
              })}
            </div>
            <Input name={`obs_${a.id}`} defaultValue={a.observacao} placeholder="Conteúdo da aula, recado..." className="md:flex-1" />
          </div>
        ))}
      </Card>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BotaoEnviar>
          <Check /> Salvar chamada
        </BotaoEnviar>
        <Botao
          type="button"
          variante="secundario"
          onClick={() => setStatus(Object.fromEntries(alunos.map((a) => [a.id, "presente"])))}
        >
          <CheckCheck /> Todos presentes
        </Botao>
        <span className="text-xs text-suave">P presente · F falta · J justificada · R reposição</span>
      </div>
    </Formulario>
  );
}
