import { LogOut } from "lucide-react";

import { sair } from "@/app/acoes/auth";
import { primeiroNome } from "@/lib/formato";

export function CaixaUsuario({ nome, detalhe }: { nome: string; detalhe: string }) {
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-borda p-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-suave text-sm font-semibold text-marca-texto">
        {iniciais}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{primeiroNome(nome)}</p>
        <p className="truncate text-xs text-suave">{detalhe}</p>
      </div>
      <form action={sair}>
        <button className="rounded-lg p-2 text-suave hover:bg-fundo hover:text-texto" title="Sair" aria-label="Sair">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
