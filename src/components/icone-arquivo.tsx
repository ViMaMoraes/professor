import { FileArchive, FileAudio, FileImage, FileMusic, FileText, FileVideo } from "lucide-react";

export function IconeArquivo({ nome, className }: { nome: string; className?: string }) {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const Icone = ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)
    ? FileAudio
    : ["mp4", "mov", "webm"].includes(ext)
      ? FileVideo
      : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
        ? FileImage
        : ext === "zip"
          ? FileArchive
          : ["mid", "midi", "musicxml", "mxl", "mscz", "gp", "gp5", "gpx", "sib"].includes(ext)
            ? FileMusic
            : FileText;
  return <Icone className={className} />;
}
