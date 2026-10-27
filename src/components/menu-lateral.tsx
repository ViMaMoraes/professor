"use client";

import { Bell, Building2, CircleCheckBig, CloudDownload, Crown, LayoutDashboard, Menu, ReceiptText, Settings, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";

import { Logo } from "./logo";
import { cn } from "./ui";

const ITENS = [
  { href: "/painel", nome: "Painel", icone: LayoutDashboard },
  { href: "/alunos", nome: "Alunos", icone: Users },
  { href: "/instituicoes", nome: "Instituições", icone: Building2 },
  { href: "/chamada", nome: "Chamada", icone: CircleCheckBig },
  { href: "/recibos", nome: "Recibos", icone: ReceiptText },
  { href: "/materiais", nome: "Downloads", icone: CloudDownload },
  { href: "/avisos", nome: "Avisos", icone: Bell },
  { href: "/configuracoes", nome: "Configurações", icone: Settings },
];
const ITEM_ADMIN = { href: "/admin", nome: "Administração", icone: Crown };

export function MenuLateral({ rodape, master = false }: { rodape: ReactNode; master?: boolean }) {
  const [aberto, setAberto] = useState(false);

  const fechar = () => setAberto(false);
  // usePathname depende da URL; o fallback mostra os mesmos links sem destaque enquanto ela chega
  const navegacao = (
    <Suspense fallback={<Navegacao caminho="" aoNavegar={fechar} master={master} />}>
      <NavegacaoAtiva aoNavegar={fechar} master={master} />
    </Suspense>
  );

  const marca = (
    <Link href="/painel" className="flex items-center gap-2.5 font-semibold">
      <Logo />
      Acesso professor
    </Link>
  );

  return (
    <>
      {/* celular: barra no topo + gaveta */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borda bg-superficie/80 px-4 backdrop-blur lg:hidden">
        {marca}
        <button onClick={() => setAberto(true)} className="rounded-lg p-2 hover:bg-fundo" aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
      </header>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-superficie p-4 shadow-xl">
            <div className="flex items-center justify-between">
              {marca}
              <button onClick={() => setAberto(false)} className="rounded-lg p-2 hover:bg-fundo" aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            {navegacao}
            <div className="mt-auto">{rodape}</div>
          </aside>
        </div>
      )}

      {/* computador: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-borda bg-superficie p-4 lg:flex">
        <div className="px-2 pt-1">{marca}</div>
        {navegacao}
        <div className="mt-auto">{rodape}</div>
      </aside>
    </>
  );
}

function NavegacaoAtiva({ aoNavegar, master }: { aoNavegar: () => void; master: boolean }) {
  return <Navegacao caminho={usePathname()} aoNavegar={aoNavegar} master={master} />;
}

function Navegacao({ caminho, aoNavegar, master }: { caminho: string; aoNavegar: () => void; master: boolean }) {
  return (
    <nav className="flex flex-col gap-1">
      {(master ? [...ITENS, ITEM_ADMIN] : ITENS).map(({ href, nome, icone: Icone }) => {
        const ativo = caminho === href || caminho.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={aoNavegar}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              ativo ? "bg-marca-suave text-marca-texto" : "text-suave hover:bg-fundo hover:text-texto",
            )}
          >
            <Icone className="size-4" />
            {nome}
          </Link>
        );
      })}
    </nav>
  );
}
