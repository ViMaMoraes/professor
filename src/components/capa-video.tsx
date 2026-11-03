"use client";

import { Play, Video } from "lucide-react";
import { useState } from "react";

import { cn } from "./ui";

/** Capa (miniatura) do vídeo; se não carregar (ex.: vídeo do Drive ainda processando), mostra um ícone. */
export function CapaVideo({ src, className, visto }: { src: string; className?: string; visto?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl bg-fundo", className)}>
      {!falhou && (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura do Drive/YouTube (domínio externo)
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className="absolute inset-0 size-full object-cover" />
      )}
      {falhou && <Video className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-suave" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/55 p-2.5 text-white">
          <Play className="size-5 fill-current" />
        </span>
      </span>
      {visto && <span className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">✓ visto</span>}
    </div>
  );
}
