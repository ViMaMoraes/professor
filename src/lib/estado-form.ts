export type EstadoForm = { erro?: string; ok?: string } | null;

/** Lê um campo de texto do FormData, já sem espaços; vazio vira null. */
export function texto(dados: FormData, nome: string): string | null {
  const valor = dados.get(nome);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}
