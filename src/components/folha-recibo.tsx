import type { Recibo } from "@/lib/db/schema";
import { numeroRecibo } from "@/lib/formato";
import type { Pagador } from "@/lib/pagador";
import { linhaDataRecibo, textoRecibo, type ProfessorRecibo } from "@/lib/recibo-pdf";

import { cn } from "./ui";

/** O recibo como sai no PDF: folha branca com título, texto, local e data e assinatura. */
export function FolhaRecibo({
  recibo,
  pagador,
  professor,
  className,
}: {
  recibo: Recibo;
  pagador: Pagador;
  professor: ProfessorRecibo;
  className?: string;
}) {
  return (
    <div className={cn("bg-white p-6 text-zinc-900 sm:p-14", className)}>
      <div className="relative mb-10 text-center sm:mb-12">
        <p className="font-bold tracking-wide">RECIBO</p>
        <p className="absolute top-0.5 right-0 text-xs text-zinc-500">Nº {numeroRecibo(recibo.numero)}</p>
      </div>
      <p className="leading-relaxed">{textoRecibo(recibo, pagador, professor)}</p>
      <p className="mt-10">{linhaDataRecibo(recibo.dataPagamento, professor.cidade)}</p>
      <div className="mt-14 w-64 max-w-full sm:mt-16">
        <div className="flex h-20 items-end">
          {professor.assinatura && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL salva no banco
            <img src={professor.assinatura} alt="Assinatura" className="max-h-full max-w-full" />
          )}
        </div>
        <div className="border-t border-zinc-800 pt-1 text-sm">{professor.nome}</div>
      </div>
    </div>
  );
}
