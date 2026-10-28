"use client";

import { Eye, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useRef } from "react";

import { salvarMensagemAluno } from "@/app/acoes/alunos";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { useInterface } from "@/components/interface";
import { Botao, Card, CardTitulo, Textarea } from "@/components/ui";

/** Recado do professor que aparece em destaque quando o aluno entra (separado do diário de aulas). */
export function MensagemAluno({ alunoId, mensagem }: { alunoId: number; mensagem: string | null }) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const { confirmar } = useInterface();

  async function remover() {
    if (!(await confirmar({ titulo: "Remover a mensagem?", mensagem: "Ela deixa de aparecer no acesso do aluno.", confirmar: "Remover", perigo: true }))) return;
    if (!campo.current) return;
    campo.current.value = "";
    campo.current.form?.requestSubmit();
  }

  return (
    <Card>
      <CardTitulo icone={<MessageSquareText />}>Mensagem para o aluno</CardTitulo>
      <Formulario acao={salvarMensagemAluno.bind(null, alunoId)} className="space-y-3 p-5">
        <p className="text-xs text-suave">
          Aparece em destaque quando o aluno entra: um lembrete, um recado, um parabéns… Se ele ativou as notificações, recebe um aviso
          quando a mensagem muda.
        </p>
        <Textarea
          ref={campo}
          name="mensagem"
          rows={3}
          maxLength={1000}
          defaultValue={mensagem ?? ""}
          placeholder="Ex.: Lembre de trazer o caderno na próxima aula!"
          aria-label="Mensagem para o aluno"
        />
        <div className="flex flex-wrap items-center gap-2">
          <BotaoEnviar tamanho="sm">
            <Send /> {mensagem ? "Atualizar mensagem" : "Enviar mensagem"}
          </BotaoEnviar>
          {mensagem && (
            <Botao type="button" variante="secundario" tamanho="sm" onClick={remover}>
              <Trash2 /> Remover
            </Botao>
          )}
        </div>
        {mensagem && (
          <p className="flex items-center gap-1.5 text-xs text-suave">
            <Eye className="size-3.5" /> O aluno está vendo esta mensagem.
          </p>
        )}
      </Formulario>
    </Card>
  );
}
