import type { NextConfig } from "next";

// Cache Components / Partial Prefetching ficam desligados: dependem dos timers do Node e travam a
// renderização no runtime da Cloudflare Workers. Como tudo aqui é dado de usuário logado, as páginas
// são renderizadas a cada acesso de qualquer forma.
// Identifica cada publicação (o commit, no Workers Builds). O site compara com a versão que está aberta
// no navegador e avisa "Nova versão disponível". Fica em process.env para ser a mesma em todos os
// processos do build (o Next carrega este arquivo mais de uma vez).
process.env.VERSAO_APP ??= process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36);

const nextConfig: NextConfig = {
  env: { VERSAO_APP: process.env.VERSAO_APP },
  serverExternalPackages: ["@libsql/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// `npm run dev` continua usando o SQLite local; a integração com a Cloudflare só entra no build/preview/deploy.
