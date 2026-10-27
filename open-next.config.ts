import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Os dados do app (alunos, chamadas, recibos...) são sempre lidos do banco na hora;
// o cache só guarda as páginas pré-montadas no build, então os arquivos estáticos bastam (sem R2).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
