import type { MetadataRoute } from "next";

import { NOME_APP } from "@/lib/marca";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_APP,
    short_name: NOME_APP,
    description: "Acesso professor e acesso aluno: materiais, avisos, chamada e recibos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
