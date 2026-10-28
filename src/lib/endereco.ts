import "server-only";

/**
 * Endereço oficial do site (ex.: https://professor.mmoraes.com.br), da variável ENDERECO_SITE.
 * Usado nos links que o professor copia e envia (acesso do aluno, dados de um professor novo),
 * para nunca sair o endereço do workers.dev. Sem a variável, vale o endereço aberto no navegador.
 */
export function enderecoSite(): string | null {
  const valor = process.env.ENDERECO_SITE?.trim().replace(/\/+$/, "");
  return valor && /^https?:\/\/[^/\s]+$/.test(valor) ? valor : null;
}
