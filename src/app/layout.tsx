import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ProvedorInterface } from "@/components/interface";
import { RegistrarServiceWorker } from "@/components/registrar-sw";
import { NOME_APP } from "@/lib/marca";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: NOME_APP, template: `%s · ${NOME_APP}` },
  description: "Alunos, chamada, recibos e materiais para professores.",
  applicationName: NOME_APP,
  appleWebApp: { capable: true, title: NOME_APP, statusBarStyle: "default" },
  icons: { icon: "/icons/icone-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#262626" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ProvedorInterface>{children}</ProvedorInterface>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
