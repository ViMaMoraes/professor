"use client";

import { Check, CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";

import { salvarVideo } from "@/app/acoes/videos";
import { CapaVideo } from "@/components/capa-video";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SeletorAlunos, type AlunoSelecionavel } from "@/components/seletor-alunos";
import { BotaoLink, Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";
import type { Video } from "@/lib/db/schema";
import { lerLinkVideo, urlCapa } from "@/lib/video";

type Props = {
  video?: Video & { alunoIds: number[] };
  modulos: { id: number; nome: string }[];
  alunos: AlunoSelecionavel[];
  instituicoes: { id: number; nome: string }[];
  moduloInicial?: number;
};

export function FormVideo(props: Props) {
  // muda a cada "adicionar outro": recria o formulário vazio
  const [versao, setVersao] = useState(0);
  return <CamposVideo key={versao} {...props} limpar={() => setVersao((v) => v + 1)} />;
}

function CamposVideo({ video, modulos, alunos, instituicoes, moduloInicial, limpar }: Props & { limpar: () => void }) {
  const [link, setLink] = useState(video?.link ?? "");
  const [paraTodos, setParaTodos] = useState(video?.paraTodos ?? true);
  const reconhecido = lerLinkVideo(link);

  return (
    <Formulario
      acao={salvarVideo.bind(null, video?.id ?? null)}
      cadastrarOutro={video ? undefined : { lista: "/videos", limpar, pergunta: "Deseja adicionar outro?" }}
    >
      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Campo rotulo="Link do vídeo (YouTube ou Google Drive) *">
            <Input
              name="link"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://youtu.be/... ou https://drive.google.com/file/d/..."
              autoComplete="off"
            />
          </Campo>
          {link.trim() === "" ? (
            <p className="mt-1.5 text-xs text-suave">
              YouTube: pode ser “não listado” (só quem tem o link vê). Drive: compartilhe o arquivo como “Qualquer pessoa com o link”. O
              aluno assiste dentro do site.
            </p>
          ) : reconhecido ? (
            <div className="mt-2 flex items-center gap-3">
              <CapaVideo src={urlCapa({ origem: reconhecido.origem, origemId: reconhecido.id, link })} className="w-32" />
              <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <CircleCheck className="size-3.5" /> Vídeo do {reconhecido.origem === "youtube" ? "YouTube" : "Google Drive"} reconhecido
              </p>
            </div>
          ) : (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <CircleAlert className="size-3.5" /> Esse não parece um link de vídeo do YouTube ou de um arquivo do Google Drive.
            </p>
          )}
        </div>

        <Campo rotulo="Título *" className="sm:col-span-2">
          <Input name="titulo" required defaultValue={video?.titulo} placeholder="Ex.: Escala de Sol maior" />
        </Campo>
        <Campo rotulo="Módulo" dica={modulos.length ? undefined : "Crie módulos na página Vídeos para organizar."}>
          <Select name="moduloId" defaultValue={video?.moduloId ?? moduloInicial ?? ""}>
            <option value="">Outros vídeos (sem módulo)</option>
            {modulos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Descrição" className="sm:col-span-3">
          <Textarea
            name="descricao"
            rows={3}
            defaultValue={video?.descricao ?? ""}
            placeholder="O que o aluno vai aprender, o que praticar..."
          />
        </Campo>

        <fieldset className="sm:col-span-3">
          <legend className="mb-2 text-sm font-medium">Quem pode assistir?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { valor: "todos", titulo: "Todos os alunos", desc: "Qualquer aluno com acesso." },
              { valor: "alguns", titulo: "Alunos selecionados", desc: "Só quem você marcar abaixo." },
            ].map((op) => (
              <label
                key={op.valor}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-borda p-3 transition-colors",
                  (op.valor === "todos") === paraTodos && "border-marca bg-marca-suave/40",
                )}
              >
                <input
                  type="radio"
                  name="destino"
                  value={op.valor}
                  checked={(op.valor === "todos") === paraTodos}
                  onChange={() => setParaTodos(op.valor === "todos")}
                  className="mt-1 accent-marca"
                />
                <span>
                  <span className="block text-sm font-medium">{op.titulo}</span>
                  <span className="text-xs text-suave">{op.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <div className={cn("mt-3", paraTodos && "hidden")}>
            <SeletorAlunos alunos={alunos} instituicoes={instituicoes} iniciais={video?.alunoIds} />
          </div>
        </fieldset>

        <div className="flex gap-2 sm:col-span-3">
          <BotaoEnviar>
            <Check /> {video ? "Salvar" : "Publicar vídeo"}
          </BotaoEnviar>
          <BotaoLink href={video ? `/videos/${video.id}` : "/videos"} variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
