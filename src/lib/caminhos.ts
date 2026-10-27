import path from "node:path";

// O comentário turbopackIgnore evita que o build tente empacotar a pasta de dados
// (que só existe em tempo de execução) junto com o código.
export const PASTA_DADOS = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
