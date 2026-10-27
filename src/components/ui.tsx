import { clsx, type ClassValue } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const VARIANTES = {
  primario: "bg-marca text-marca-contraste shadow-sm hover:bg-marca-forte",
  secundario: "border border-borda bg-superficie hover:bg-fundo",
  fantasma: "hover:bg-marca-suave hover:text-marca-texto",
  perigo: "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950",
  sucesso: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
};
const TAMANHOS = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-10 px-4 text-sm gap-2", icone: "size-9" };

type Estilo = { variante?: keyof typeof VARIANTES; tamanho?: keyof typeof TAMANHOS };

export function estiloBotao({ variante = "primario", tamanho = "md" }: Estilo = {}, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors",
    "focus-visible:ring-2 focus-visible:ring-marca/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    className,
  );
}

export function Botao({ variante, tamanho, className, ...props }: ComponentProps<"button"> & Estilo) {
  return <button className={estiloBotao({ variante, tamanho }, className)} {...props} />;
}

export function BotaoLink({ variante, tamanho, className, ...props }: ComponentProps<typeof Link> & Estilo) {
  return <Link className={estiloBotao({ variante, tamanho }, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-borda bg-superficie shadow-xs", className)} {...props} />;
}

export function CardTitulo({ icone, children, acao }: { icone?: ReactNode; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-borda px-5 py-3.5">
      <h2 className="flex items-center gap-2 font-semibold [&_svg]:size-4 [&_svg]:text-marca-texto">
        {icone}
        {children}
      </h2>
      {acao}
    </div>
  );
}

const campo =
  "w-full rounded-lg border border-borda bg-superficie px-3 text-sm shadow-xs transition-colors placeholder:text-suave/70 focus:border-marca focus:ring-2 focus:ring-marca/20 focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(campo, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(campo, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(campo, "h-10 pr-8", className)} {...props} />;
}

export function Campo({
  rotulo,
  dica,
  className,
  children,
}: {
  rotulo: string;
  dica?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-suave">{dica}</span>}
    </label>
  );
}

const CORES_SELO = {
  neutro: "bg-fundo text-suave border-borda",
  marca: "bg-marca-suave text-marca-texto border-transparent",
  verde: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  vermelho: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  amarelo: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  azul: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
};

export function Selo({ cor = "neutro", className, ...props }: ComponentProps<"span"> & { cor?: keyof typeof CORES_SELO }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CORES_SELO[cor],
        className,
      )}
      {...props}
    />
  );
}

export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Vazio({ icone, titulo, children }: { icone: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 rounded-full bg-marca-suave p-3 text-marca-texto [&_svg]:size-6">{icone}</div>
      <p className="font-medium">{titulo}</p>
      {children && <div className="text-sm text-suave">{children}</div>}
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-borda/60", className)} />;
}

export function EsqueletoPagina() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-4 w-80" />
      </div>
      <Esqueleto className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export function Tabela({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:tracking-wide [&_th]:text-suave [&_th]:uppercase",
          "[&_tbody_tr]:border-t [&_tbody_tr]:border-borda [&_tbody_tr:hover]:bg-fundo/60",
          className,
        )}
        {...props}
      />
    </div>
  );
}
