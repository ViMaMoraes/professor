import { DatabaseZap } from "lucide-react";

import { Card } from "./ui";

/**
 * Aparece no lugar das páginas quando o site foi publicado com uma migração nova
 * que ainda não foi aplicada no D1. `paraAluno` mostra só um aviso simples, sem instruções técnicas.
 */
export function BancoDesatualizado({ pendentes, paraAluno = false }: { pendentes: string[]; paraAluno?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-xl bg-marca-suave p-2.5 text-marca-texto">
            <DatabaseZap className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            {paraAluno ? "Site em atualização" : "Falta atualizar o banco de dados"}
          </h1>
        </div>
        {paraAluno ? (
          <p className="text-sm text-suave">O site está passando por uma atualização. Tente de novo em alguns minutos.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-suave">
              A versão nova do site já foi publicada, mas o banco D1 ainda não recebeu as mudanças dela. Nada foi perdido: aplique a
              atualização e recarregue a página.
            </p>
            <div>
              <p className="mb-1 font-medium">Atualizações pendentes</p>
              <ul className="list-inside list-disc text-suave">
                {pendentes.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium">Opção 1: pelo terminal (na pasta do projeto)</p>
              <pre className="rounded-lg bg-fundo p-3 text-xs break-all whitespace-pre-wrap">npx wrangler d1 migrations apply professor-db --remote</pre>
            </div>
            <div>
              <p className="mb-1 font-medium">Opção 2: pelo console do D1 (Storage &amp; Databases → D1 → professor-db → Console)</p>
              <p className="text-suave">
                Para cada arquivo pendente, em ordem, cole o conteúdo de <code>drizzle/&lt;arquivo&gt;</code> do repositório, execute e depois
                registre a atualização:
              </p>
              <pre className="mt-1 rounded-lg bg-fundo p-3 text-xs break-all whitespace-pre-wrap">
                {pendentes.map((p) => `INSERT INTO d1_migrations (name) VALUES ('${p}');`).join("\n")}
              </pre>
            </div>
            <p className="text-suave">
              Para não acontecer de novo, use como <b>Deploy command</b> no Workers Builds:{" "}
              <code>npx wrangler d1 migrations apply professor-db --remote &amp;&amp; npx wrangler deploy</code>
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}
