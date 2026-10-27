"use client";

import { Check, CloudUpload, Search } from "lucide-react";
import { useState } from "react";

import { salvarMaterial } from "@/app/acoes/materiais";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { BotaoLink, Campo, Card, cn, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIAS_MATERIAL } from "@/lib/constantes";
import { tamanhoArquivo } from "@/lib/formato";

type Material = {
  id: number;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  paraTodos: boolean;
  nomeOriginal: string;
  tamanho: number;
  alunoIds: number[];
};

export function FormMaterial({
  material,
  alunos,
}: {
  material?: Material;
  alunos: { id: number; nome: string; instrumento: string | null }[];
}) {
  const [paraTodos, setParaTodos] = useState(material?.paraTodos ?? false);
  const [filtro, setFiltro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const acao = salvarMaterial.bind(null, material?.id ?? null);

  return (
    <Formulario acao={acao}>
      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        {material ? (
          <p className="text-sm text-suave sm:col-span-3">
            Arquivo: <span className="text-texto">{material.nomeOriginal}</span> ({tamanhoArquivo(material.tamanho)})
          </p>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-borda p-8 text-center transition-colors hover:border-marca hover:bg-marca-suave/40 sm:col-span-3",
              arquivo && "border-marca bg-marca-suave/40",
            )}
          >
            <CloudUpload className="size-8 text-marca-texto" />
            {arquivo ? (
              <span className="font-medium">
                {arquivo.name} <span className="text-suave">({tamanhoArquivo(arquivo.size)})</span>
              </span>
            ) : (
              <>
                <span className="font-medium">Clique para escolher o arquivo</span>
                <span className="text-xs text-suave">PDF, áudio, vídeo, imagem, MIDI, MusicXML, Guitar Pro, MuseScore, ZIP… até 100 MB</span>
              </>
            )}
            <input type="file" name="arquivo" required className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
        )}

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
          <legend className="mb-2 text-sm font-medium">Quem pode baixar?</legend>
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

          <div className={cn("mt-3 rounded-xl border border-borda", paraTodos && "hidden")}>
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
                  <input type="checkbox" name="alunos" value={a.id} defaultChecked={material?.alunoIds.includes(a.id)} className="size-4 accent-marca" />
                  {a.nome}
                  {a.instrumento && <span className="text-xs text-suave">{a.instrumento}</span>}
                </label>
              ))}
            </div>
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
