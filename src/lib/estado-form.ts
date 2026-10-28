/** Resultado de uma ação de formulário. `criado` = um cadastro novo foi salvo (o formulário pergunta se quer cadastrar outro). */
export type EstadoForm = { erro?: string; ok?: string; criado?: boolean } | null;

/** Lê um campo de texto do FormData, já sem espaços; vazio vira null. */
export function texto(dados: FormData, nome: string): string | null {
  const valor = dados.get(nome);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}
