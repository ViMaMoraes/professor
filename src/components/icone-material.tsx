import { FileAudio, FileMusic, FileText, FileVideo, Folder } from "lucide-react";

import type { TipoDrive } from "@/lib/db/schema";

export function IconeMaterial({ tipo, categoria, className }: { tipo: TipoDrive; categoria: string | null; className?: string }) {
  const Icone =
    tipo === "pasta"
      ? Folder
      : categoria === "Áudio / Playback"
        ? FileAudio
        : categoria === "Vídeo"
          ? FileVideo
          : categoria === "Partitura" || categoria === "Tablatura"
            ? FileMusic
            : FileText;
  return <Icone className={className} />;
}
