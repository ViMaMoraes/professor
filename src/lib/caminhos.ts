import path from "node:path";

// Os comentários turbopackIgnore evitam que o build tente empacotar a pasta de dados
// (que só existe em tempo de execução) junto com o código.
export const PASTA_DADOS = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const PASTA_UPLOADS = path.join(/*turbopackIgnore: true*/ PASTA_DADOS, "uploads");

export function caminhoUpload(nomeArquivo: string) {
  return path.join(/*turbopackIgnore: true*/ PASTA_UPLOADS, path.basename(nomeArquivo));
}
