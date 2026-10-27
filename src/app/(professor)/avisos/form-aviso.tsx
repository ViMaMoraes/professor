"use client";

import { Search, Send } from "lucide-react";
import { useState } from "react";

import { enviarAviso } from "@/app/acoes/avisos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";

type Destino = "todos" | "instituicao" | "alguns";

export function FormAviso({
  alunos,
  instituicoes,
}: {
  alunos: { id: number; nome: string }[];
  instituicoes: { id: number; nome: string }[];
}) {
  const [destino, setDestino] = useState<Destino>("todos");
  const [filtro, setFiltro] = useState("");
  const opcoes = [
    { valor: "todos" as const, titulo: "Todos os alunos", desc: "Todos os alunos ativos." },
    ...(instituicoes.length ? [{ valor: "instituicao" as const, titulo: "Uma instituição", desc: "Os alunos de uma instituição." }] : []),
    { valor: "alguns" as const, titulo: "Alunos selecionados", desc: "Só quem você marcar." },
  ];

  return (
    <Formulario acao={enviarAviso} limparAoEnviar>
      <Card className="grid gap-4 p-5">
        <Campo rotulo="Título *">
          <Input name="titulo" required maxLength={120} placeholder="Ex.: Não haverá aula na sexta" />
        </Campo>
        <Campo rotulo="Mensagem" dica="Opcional. Aparece na área do aluno e na notificação.">
          <Textarea name="mensagem" rows={3} maxLength={2000} />
        </Campo>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Para quem?</legend>
          <div className={cn("grid gap-2", opcoes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {opcoes.map((op) => (
              <label
                key={op.valor}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-borda p-3 transition-colors",
                  destino === op.valor && "border-marca bg-marca-suave/40",
                )}
              >
                <input
                  type="radio"
                  name="destino"
                  value={op.valor}
                  checked={destino === op.valor}
                  onChange={() => setDestino(op.valor)}
                  className="mt-1 accent-marca"
                />
                <span>
                  <span className="block text-sm font-medium">{op.titulo}</span>
                  <span className="text-xs text-suave">{op.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {destino === "instituicao" && (
            <Campo rotulo="Instituição *" className="mt-3">
              <Select name="instituicaoId" required defaultValue="">
                <option value="">Selecione...</option>
                {instituicoes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
              </Select>
            </Campo>
          )}

          <div className={cn("mt-3 rounded-xl border border-borda", destino !== "alguns" && "hidden")}>
            <div className="relative border-b border-borda p-2">
              <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-suave" />
              <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar alunos..." className="h-9 border-0 pl-9 shadow-none" />
            </div>
            <div className="grid max-h-64 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
              {alunos.length === 0 && <p className="p-2 text-sm text-suave">Nenhum aluno ativo cadastrado.</p>}
              {alunos.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fundo",
                    !a.nome.toLowerCase().includes(filtro.toLowerCase()) && "hidden",
                  )}
                >
                  <input type="checkbox" name="alunos" value={a.id} className="size-4 accent-marca" />
                  {a.nome}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <div>
          <BotaoEnviar>
            <Send /> Enviar aviso
          </BotaoEnviar>
        </div>
      </Card>
    </Formulario>
  );
}
