import type { EstadoForm } from "./estado-form";

/** Junta a mensagem do erro e das causas (o Drizzle embrulha o erro do banco em `cause`). */
function mensagens(erro: unknown): string {
  const partes: string[] = [];
  let atual: unknown = erro;
  for (let i = 0; atual && i < 5; i++) {
    if (atual instanceof Error) {
      partes.push(atual.message);
      atual = atual.cause;
    } else {
      partes.push(String(atual));
      break;
    }
  }
  return partes.join(" | ");
}

/**
 * Traduz erros de configuração da hospedagem (os mais comuns logo depois de publicar)
 * numa mensagem que aparece na tela. Outros erros são relançados normalmente.
 */
export function explicarErroDeConfiguracao(erro: unknown): EstadoForm {
  const texto = mensagens(erro);
  console.error("[configuracao]", texto);
  if (texto.includes("SESSION_SECRET")) {
    return {
      erro: "Configuração pendente no servidor: cadastre o secret SESSION_SECRET (Cloudflare → Workers → professor → Settings → Variables and Secrets) e publique de novo.",
    };
  }
  if (/no such (column|table)/i.test(texto)) {
    return {
      erro: "O banco de dados está desatualizado em relação ao site: aplique as migrações (npx wrangler d1 migrations apply professor-db --remote) ou rode o SQL de atualização no console do D1.",
    };
  }
  if (/D1_ERROR|SQLITE_|database/i.test(texto)) {
    return { erro: `Erro no banco de dados: ${texto.slice(0, 200)}` };
  }
  throw erro;
}
