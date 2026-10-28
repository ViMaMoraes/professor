"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { enviarAviso } from "@/app/acoes/avisos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SeletorAlunos, type AlunoSelecionavel } from "@/components/seletor-alunos";
import { Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";

type Destino = "todos" | "instituicao" | "alguns";

export function FormAviso({
  alunos,
  instituicoes,
}: {
  alunos: AlunoSelecionavel[];
  instituicoes: { id: number; nome: string }[];
}) {
  const [destino, setDestino] = useState<Destino>("todos");
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

          <div className={cn("mt-3", destino !== "alguns" && "hidden")}>
            <SeletorAlunos alunos={alunos} instituicoes={instituicoes} />
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
