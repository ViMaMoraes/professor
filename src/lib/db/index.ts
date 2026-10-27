import fs from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { PASTA_DADOS } from "../caminhos";
import * as schema from "./schema";

function criarBanco() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    url = "file:" + path.join(/*turbopackIgnore: true*/ PASTA_DADOS, "professor.db");
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const db = drizzle(client, { schema });

  // aplica as migrações uma vez por processo, na primeira consulta
  const pronto = (async () => {
    await client.execute("PRAGMA foreign_keys = ON");
    await migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  })();

  return { db, pronto };
}

type Banco = ReturnType<typeof criarBanco>;
const global = globalThis as unknown as { __banco?: Banco };
// no modo dev o módulo é recarregado a cada mudança; reaproveita a conexão
const banco = (global.__banco ??= criarBanco());

export async function getDb() {
  await banco.pronto;
  return banco.db;
}

export { schema };
