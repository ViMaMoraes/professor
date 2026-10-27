import type { NextConfig } from "next";

// Cache Components / Partial Prefetching ficam desligados: dependem dos timers do Node e travam a
// renderização no runtime da Cloudflare Workers. Como tudo aqui é dado de usuário logado, as páginas
// são renderizadas a cada acesso de qualquer forma.
const nextConfig: NextConfig = {
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
