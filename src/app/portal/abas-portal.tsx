"use client";

import { Clapperboard, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui";

/** Abas da área do aluno: Início (downloads, aulas, avisos) e Vídeos. */
export function AbasPortal() {
  const caminho = usePathname();
  const abas = [
    { href: "/portal", nome: "Início", Icone: House, ativa: caminho === "/portal" },
    { href: "/portal/videos", nome: "Vídeos", Icone: Clapperboard, ativa: caminho.startsWith("/portal/videos") },
  ];
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4" aria-label="Área do aluno">
      {abas.map(({ href, nome, Icone, ativa }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativa ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            ativa ? "border-marca text-texto" : "border-transparent text-suave hover:text-texto",
          )}
        >
          <Icone className="size-4" /> {nome}
        </Link>
      ))}
    </nav>
  );
}
