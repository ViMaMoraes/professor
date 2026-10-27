import type { AnyD1Database } from "drizzle-orm/d1";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import diario from "../../../drizzle/meta/_journal.json";

import * as schema from "./schema";

/**
 * O app roda em dois lugares:
 * - Cloudflare Workers: banco D1 (binding `DB`); as migrações são aplicadas com `wrangler d1 migrations apply`.
 * - Node (npm run dev / start, testes, scripts): SQLite/libSQL em arquivo (data/professor.db) ou remoto
 *   (DATABASE_URL); as migrações rodam sozinhas na primeira consulta.
 * Os dois falam o mesmo dialeto SQLite no Drizzle. Atenção: o D1 não tem transações; use db.batch().
 */
export type Banco = LibSQLDatabase<typeof schema>;

const naCloudflare = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

async function bindingD1() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const d1 = (env as unknown as { DB?: AnyD1Database }).DB;
  if (!d1) throw new Error("Binding D1 `DB` não configurado no wrangler.jsonc.");
  return d1;
}

async function bancoCloudflare(): Promise<Banco> {
  const [d1, { drizzle }] = await Promise.all([bindingD1(), import("drizzle-orm/d1")]);
  // mesma API de consultas; só o driver muda
  return drizzle(d1, { schema }) as unknown as Banco;
}

let migracoesEmDia = false;

/**
 * Migrações que o site espera e ainda não foram aplicadas no D1 (ex.: publicou o site novo e esqueceu o
 * `wrangler d1 migrations apply`). Assim a tela explica o que fazer, em vez de quebrar com erro do banco.
 * No Node as migrações rodam sozinhas, então nunca há pendência.
 */
export async function migracoesPendentes(): Promise<string[]> {
  if (migracoesEmDia || !naCloudflare()) return [];
  try {
    const d1 = await bindingD1();
    const { results } = (await d1.prepare("select name from d1_migrations").all()) as { results: { name: string }[] };
    const aplicadas = new Set(results.map((r) => r.name));
    const pendentes = diario.entries.map((e) => `${e.tag}.sql`).filter((nome) => !aplicadas.has(nome));
    migracoesEmDia = pendentes.length === 0;
    return pendentes;
  } catch (erro) {
    // sem a tabela de controle não dá para saber; segue normalmente
    console.error("[migracoes]", erro);
    return [];
  }
}

async function criarBancoLocal() {
  const [fs, path, { createClient }, { drizzle }, { migrate }, { PASTA_DADOS }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
    import("@libsql/client"),
    import("drizzle-orm/libsql"),
    import("drizzle-orm/libsql/migrator"),
    import("../caminhos"),
  ]);
  let url = process.env.DATABASE_URL;
  if (!url) {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    url = "file:" + path.join(/*turbopackIgnore: true*/ PASTA_DADOS, "professor.db");
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const db = drizzle(client, { schema });
  await client.execute("PRAGMA foreign_keys = ON");
  await migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return db;
}

const global = globalThis as unknown as { __bancoLocal?: Promise<Banco> };

export async function getDb(): Promise<Banco> {
  if (naCloudflare()) return bancoCloudflare();
  // no modo dev o módulo é recarregado a cada mudança; reaproveita a conexão e roda as migrações uma vez
  return (global.__bancoLocal ??= criarBancoLocal());
}

export { schema };
