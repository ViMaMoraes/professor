import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" só faz sentido dentro do Next; nos testes vira um módulo vazio
      "server-only": path.resolve(import.meta.dirname, "src/lib/__tests__/vazio.ts"),
    },
  },
  test: { environment: "node" },
});
