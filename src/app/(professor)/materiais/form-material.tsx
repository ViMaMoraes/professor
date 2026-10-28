"use client";

import { Check, CircleAlert, CircleCheck, ExternalLink } from "lucide-react";
import { useState } from "react";

import { salvarMaterial } from "@/app/acoes/materiais";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { SeletorAlunos, type AlunoSelecionavel } from "@/components/seletor-alunos";
import { BotaoLink, Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIAS_MATERIAL } from "@/lib/constantes";
import { lerLinkDrive, NOME_TIPO_DRIVE } from "@/lib/drive";

type Material = {
  id: number;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  paraTodos: boolean;
  link: string;
  alunoIds: number[];
};

type Props = { material?: Material; alunos: AlunoSelecionavel[]; instituicoes: { id: number; nome: string }[] };

export function FormMaterial(props: Props) {
  // muda a cada "adicionar outro": recria o formulário vazio
  const [versao, setVersao] = useState(0);
  return <CamposMaterial key={versao} {...props} limpar={() => setVersao((v) => v + 1)} />;
}

function CamposMaterial({ material, alunos, instituicoes, limpar }: Props & { limpar: () => void }) {
  const [paraTodos, setParaTodos] = useState(material?.paraTodos ?? false);
  const [link, setLink] = useState(material?.link ?? "");
  const drive = lerLinkDrive(link);
  const acao = salvarMaterial.bind(null, material?.id ?? null);

  return (
    <Formulario acao={acao} cadastrarOutro={material ? undefined : { lista: "/materiais", limpar, pergunta: "Deseja adicionar outro?" }}>
      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Campo rotulo="Link do Google Drive *">
            <Input
              name="link"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              autoComplete="off"
            />
          </Campo>
          {link.trim() === "" ? (
            <p className="mt-1.5 text-xs text-suave">
              No Drive: clique com o botão direito no arquivo ou pasta → <b>Compartilhar</b> → em “Acesso geral” escolha{" "}
              <b>Qualquer pessoa com o link</b> → <b>Copiar link</b>.
            </p>
          ) : drive ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <CircleCheck className="size-3.5" /> {NOME_TIPO_DRIVE[drive.tipo]} reconhecido
              </span>
              <a href={drive.link} target="_blank" rel="noopener" className="flex items-center gap-1 text-marca-texto hover:underline">
                Testar link <ExternalLink className="size-3" />
              </a>
            </p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <CircleAlert className="size-3.5" /> Esse não parece um link do Google Drive.
            </p>
          )}
        </div>

        <Campo rotulo="Título *" className="sm:col-span-2">
          <Input name="titulo" required defaultValue={material?.titulo} placeholder="Ex.: Escala pentatônica - exercícios" />
        </Campo>
        <Campo rotulo="Categoria">
          <Select name="categoria" defaultValue={material?.categoria ?? ""}>
            <option value="">—</option>
            {CATEGORIAS_MATERIAL.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Descrição" className="sm:col-span-3">
          <Textarea name="descricao" rows={2} defaultValue={material?.descricao ?? ""} />
        </Campo>

        <fieldset className="sm:col-span-3">
          <legend className="mb-2 text-sm font-medium">Quem pode acessar?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { valor: "todos", titulo: "Todos os alunos", desc: "Qualquer aluno com acesso ao portal." },
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
            <SeletorAlunos alunos={alunos} instituicoes={instituicoes} iniciais={material?.alunoIds} />
          </div>
        </fieldset>

        <div className="flex gap-2 sm:col-span-3">
          <BotaoEnviar>
            <Check /> {material ? "Salvar" : "Publicar"}
          </BotaoEnviar>
          <BotaoLink href="/materiais" variante="secundario">
            Cancelar
          </BotaoLink>
        </div>
      </Card>
    </Formulario>
  );
}
