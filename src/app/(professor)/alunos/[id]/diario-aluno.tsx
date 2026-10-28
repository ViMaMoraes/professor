"use client";

import { BookOpenText, EyeOff, House, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { excluirRegistroDiario, salvarRegistroDiario } from "@/app/acoes/diario";
import { BotaoAcao } from "@/components/botao-acao";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Botao, Campo, Card, CardTitulo, cn, Input, Selo, Textarea } from "@/components/ui";
import type { RegistroDiario } from "@/lib/db/schema";
import { dataBR } from "@/lib/formato";

/** Diário de aulas do aluno: o que foi passado em cada aula e o que estudar em casa. */
export function DiarioAluno({ alunoId, registros, hoje }: { alunoId: number; registros: RegistroDiario[]; hoje: string }) {
  const [editando, setEditando] = useState<RegistroDiario | null>(null);
  // muda a cada envio para o formulário voltar limpo (e com a data de hoje)
  const [versao, setVersao] = useState(0);

  return (
    <Card id="diario" className="scroll-mt-20">
      <CardTitulo icone={<BookOpenText />}>Diário de aulas</CardTitulo>
      <Formulario
        key={editando ? `editar-${editando.id}` : `novo-${versao}`}
        acao={salvarRegistroDiario.bind(null, alunoId, editando?.id ?? null)}
        aoConcluir={() => {
          setEditando(null);
          setVersao((v) => v + 1);
        }}
        className={cn("border-b border-borda p-5", editando && "bg-marca-suave/40")}
      >
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Campo rotulo="Data *">
            <Input type="date" name="data" required defaultValue={editando?.data ?? hoje} />
          </Campo>
          <Campo rotulo="Conteúdo da aula *">
            <Textarea name="conteudo" required rows={2} defaultValue={editando?.conteudo} placeholder="Ex.: Escala de Sol maior, início da música Asa Branca" />
          </Campo>
          <Campo rotulo="Para estudar em casa" className="sm:col-start-2">
            <Textarea name="paraCasa" rows={2} defaultValue={editando?.paraCasa ?? ""} placeholder="Opcional" />
          </Campo>
          <div className="flex flex-wrap items-center gap-3 sm:col-start-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="visivelAluno" defaultChecked={editando?.visivelAluno ?? true} className="size-4 accent-marca" />
              O aluno vê no acesso dele
            </label>
            <div className="ml-auto flex gap-2">
              {editando && (
                <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setEditando(null)}>
                  <X /> Cancelar
                </Botao>
              )}
              <BotaoEnviar tamanho="sm">
                {editando ? <Pencil /> : <Plus />} {editando ? "Salvar alteração" : "Registrar aula"}
              </BotaoEnviar>
            </div>
          </div>
        </div>
      </Formulario>

      {registros.length === 0 ? (
        <p className="p-5 text-sm text-suave">Nenhuma aula registrada no diário ainda.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {registros.map((r) => (
            <li key={r.id} className={cn("flex gap-4 px-5 py-3.5 text-sm", editando?.id === r.id && "bg-marca-suave/40")}>
              <span className="w-20 shrink-0 tabular-nums text-suave">{dataBR(r.data)}</span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line">{r.conteudo}</p>
                {r.paraCasa && (
                  <p className="mt-1 flex items-start gap-1.5 whitespace-pre-line text-suave">
                    <House className="mt-0.5 size-3.5 shrink-0" /> {r.paraCasa}
                  </p>
                )}
                {!r.visivelAluno && (
                  <Selo className="mt-1.5">
                    <EyeOff className="size-3" /> só para você
                  </Selo>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditando(r);
                    document.getElementById("diario")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-texto"
                  aria-label={`Editar registro de ${dataBR(r.data)}`}
                >
                  <Pencil className="size-4" />
                </button>
                <BotaoAcao
                  acao={excluirRegistroDiario.bind(null, alunoId, r.id)}
                  confirmar={`Excluir o registro de ${dataBR(r.data)}?`}
                  sucesso="Registro excluído."
                  variante="perigo"
                  tamanho="icone"
                  className="size-8 border-transparent"
                  aria-label={`Excluir registro de ${dataBR(r.data)}`}
                >
                  <Trash2 />
                </BotaoAcao>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
