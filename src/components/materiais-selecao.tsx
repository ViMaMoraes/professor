"use client";

import { CheckSquare, Eye, FileArchive, FileStack, LoaderCircle, Square, X } from "lucide-react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";

import { useInterface } from "./interface";
import { Botao, cn, Input } from "./ui";

type Item = { id: number; titulo: string };
type Formato = "zip" | "pdf";

const Selecao = createContext<{ selecionados: number[]; alternar: (id: number) => void } | null>(null);

const PASSOS: Record<Formato, string[]> = {
  zip: ["Buscando os materiais...", "Baixando os arquivos do Drive...", "Compactando tudo em um ZIP...", "Finalizando..."],
  pdf: ["Buscando os materiais...", "Baixando os arquivos do Drive...", "Juntando as páginas em um PDF...", "Finalizando..."],
};

/**
 * Seleção de materiais com barra flutuante para baixar vários de uma vez
 * (ZIP com os arquivos separados ou um PDF único), como no sistema de partituras.
 * `itens` são os materiais que podem entrar no lote (pastas ficam de fora).
 * `comMenuLateral` centraliza a barra na área de conteúdo quando há o menu lateral do professor.
 */
export function ProvedorSelecao({
  itens,
  comMenuLateral = false,
  children,
}: {
  itens: Item[];
  comMenuLateral?: boolean;
  children: ReactNode;
}) {
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [dialogo, setDialogo] = useState<Formato | null>(null);
  const [nome, setNome] = useState("");
  const [baixando, setBaixando] = useState<Formato | null>(null);
  const [passo, setPasso] = useState(0);
  const { notificar } = useInterface();

  const alternar = (id: number) => setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todos = selecionados.length === itens.length;

  // anima os "passos" do progresso enquanto o servidor trabalha
  useEffect(() => {
    if (!baixando) return;
    const intervalo = setInterval(() => setPasso((p) => Math.min(p + 1, 3)), 1800);
    return () => clearInterval(intervalo);
  }, [baixando]);

  function abrirDialogo(formato: Formato) {
    const titulos = itens.filter((i) => selecionados.includes(i.id)).map((i) => i.titulo);
    setNome(titulos.length === 1 ? titulos[0] : "Materiais");
    setDialogo(formato);
  }

  async function baixar() {
    if (!dialogo) return;
    const formato = dialogo;
    setDialogo(null);
    setPasso(0);
    setBaixando(formato);
    try {
      const resposta = await fetch("/api/materiais/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selecionados, formato, nome }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro ?? `Falha ao baixar (${resposta.status}).`);
      }
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${nome.replace(/[\\/:*?"<>|]/g, "_").trim() || "materiais"}.${formato}`;
      link.click();
      URL.revokeObjectURL(url);

      const falhas: string[] = JSON.parse(decodeURIComponent(resposta.headers.get("X-Materiais-Falhas") ?? "%5B%5D"));
      if (falhas.length) notificar(`Download pronto, mas ${falhas.length} ficaram de fora: ${falhas.join(", ")}.`, "aviso");
      else notificar("Download pronto!");
      setSelecionados([]);
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : "Não foi possível baixar.", "erro");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <Selecao value={{ selecionados, alternar }}>
      <div className={cn(selecionados.length > 0 && "pb-24")}>{children}</div>

      {selecionados.length > 0 && !baixando && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-4 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-borda bg-superficie px-4 py-3 shadow-2xl",
            "sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:flex-nowrap sm:rounded-full sm:px-6",
            comMenuLateral && "lg:ml-32",
          )}
        >
          <span className="rounded-full bg-marca-suave px-3 py-1 text-sm font-semibold text-marca-texto">
            {selecionados.length} {selecionados.length === 1 ? "selecionado" : "selecionados"}
          </span>
          <button
            onClick={() => setSelecionados(todos ? [] : itens.map((i) => i.id))}
            className="flex items-center gap-1.5 text-sm text-suave hover:text-texto"
          >
            {todos ? <CheckSquare className="size-4" /> : <Square className="size-4" />} Todos
          </button>
          <span className="hidden h-6 w-px bg-borda sm:block" />
          <button
            onClick={() => abrirDialogo("pdf")}
            className="flex items-center gap-1.5 text-sm font-medium text-texto hover:opacity-80"
            title="Juntar os selecionados em um PDF único (ordem alfabética)"
          >
            <FileStack className="size-4" /> Juntar PDF
          </button>
          <button
            onClick={() => abrirDialogo("zip")}
            className="flex items-center gap-1.5 text-sm font-medium text-marca-texto hover:opacity-80"
            title="Baixar os selecionados em um ZIP (arquivos separados)"
          >
            <FileArchive className="size-4" /> ZIP
          </button>
          <span className="hidden h-6 w-px bg-borda sm:block" />
          <button onClick={() => setSelecionados([])} className="text-suave hover:text-texto" aria-label="Limpar seleção">
            <X className="size-5" />
          </button>
        </div>
      )}

      {dialogo && (
        <Janela aoFechar={() => setDialogo(null)}>
          <div className="mb-4 flex items-center gap-3">
            <IconeFormato formato={dialogo} />
            <div>
              <h3 className="font-semibold">Nome do arquivo</h3>
              <p className="text-xs text-suave">
                {selecionados.length} material(is) · {dialogo === "zip" ? "ZIP (separados)" : "PDF único"}
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              baixar();
            }}
          >
            <div className="relative">
              <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className="pr-14" />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-suave">.{dialogo}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Botao type="button" variante="secundario" className="flex-1" onClick={() => setDialogo(null)}>
                Cancelar
              </Botao>
              <Botao className="flex-1">Baixar</Botao>
            </div>
          </form>
        </Janela>
      )}

      {baixando && (
        <Janela>
          <div className="text-center">
            <div className="mx-auto mb-4 w-fit">
              <IconeFormato formato={baixando} grande />
            </div>
            <h3 className="text-lg font-semibold">{baixando === "zip" ? "Gerando seu ZIP..." : "Juntando em um PDF..."}</h3>
            <p className="mb-5 text-sm text-suave">{selecionados.length} material(is) selecionado(s)</p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-fundo">
              <div
                className="h-full rounded-full bg-marca transition-all duration-700"
                style={{ width: `${[15, 45, 75, 92][passo]}%` }}
              />
            </div>
            <p className="flex items-center justify-center gap-2 text-sm text-suave">
              <LoaderCircle className="size-4 animate-spin" /> {PASSOS[baixando][passo]}
            </p>
            <p className="mt-4 text-xs text-suave">Pode levar alguns segundos. Não feche a página.</p>
          </div>
        </Janela>
      )}

    </Selecao>
  );
}

/** Caixa de seleção de um material (só funciona dentro do ProvedorSelecao). */
export function CaixaSelecao({ id, titulo }: { id: number; titulo: string }) {
  const contexto = use(Selecao);
  if (!contexto) return null;
  const marcado = contexto.selecionados.includes(id);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      aria-label={`Selecionar ${titulo}`}
      onClick={() => contexto.alternar(id)}
      className={cn("shrink-0 rounded-md p-0.5 transition-colors", marcado ? "text-marca" : "text-suave/60 hover:text-suave")}
    >
      {marcado ? <CheckSquare className="size-5" /> : <Square className="size-5" />}
    </button>
  );
}

/** Botão "Ver" que abre o material numa janela dentro do site (visualização do Drive). */
export function BotaoVer({ id, titulo, className }: { id: number; titulo: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-fundo", className)}
        title="Ver aqui"
      >
        <Eye className="size-4" /> <span>Ver</span>
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4" onClick={() => setAberto(false)}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-superficie shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 bg-marca px-4 py-3 text-marca-contraste">
              <h3 className="truncate font-semibold">{titulo}</h3>
              <div className="flex items-center gap-1">
                <a href={`/api/materiais/${id}`} target="_blank" rel="noopener" className="rounded-lg px-3 py-1.5 text-sm hover:bg-marca-contraste/15">
                  Abrir no Drive
                </a>
                <button onClick={() => setAberto(false)} className="rounded-lg p-1.5 hover:bg-marca-contraste/15" aria-label="Fechar">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <iframe src={`/api/materiais/${id}?ver=1`} title={titulo} className="flex-1 border-0 bg-fundo" allow="autoplay; fullscreen" />
          </div>
        </div>
      )}
    </>
  );
}

function Janela({ children, aoFechar }: { children: ReactNode; aoFechar?: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={aoFechar}>
      <div className="w-full max-w-sm rounded-2xl bg-superficie p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function IconeFormato({ formato, grande }: { formato: Formato; grande?: boolean }) {
  const Icone = formato === "zip" ? FileArchive : FileStack;
  return (
    <div className={cn("flex items-center justify-center rounded-xl bg-marca-suave text-marca-texto", grande ? "size-16 rounded-full" : "size-11")}>
      <Icone className={grande ? "size-8" : "size-6"} />
    </div>
  );
}
