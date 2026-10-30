/**
 * Máscaras de CPF/CNPJ, RG e telefone. Usadas nos campos (enquanto digita), ao salvar (padroniza o que
 * foi colado sem pontuação) e no recibo (formata também o que foi cadastrado antes das máscaras).
 */

export const soDigitos = (valor: string | null | undefined) => (valor ?? "").replace(/\D/g, "");

/** Encaixa os dígitos no modelo, só até onde já foi digitado ("#" = dígito). */
function aplicar(digitos: string, modelo: string) {
  let saida = "";
  let i = 0;
  for (const c of modelo) {
    if (i >= digitos.length) break;
    if (c === "#") saida += digitos[i++];
    else saida += c;
  }
  return saida;
}

/** CPF (até 11 dígitos) ou CNPJ (12 a 14): 000.000.000-00 / 00.000.000/0000-00. */
export function mascaraDocumento(valor: string | null | undefined) {
  const d = soDigitos(valor).slice(0, 14);
  return d.length <= 11 ? aplicar(d, "###.###.###-##") : aplicar(d, "##.###.###/####-##");
}

/** (11) 99999-9999 ou (11) 3333-4444. Um +55 colado na frente é ignorado. */
export function mascaraTelefone(valor: string | null | undefined) {
  let d = soDigitos(valor);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  return d.length <= 10 ? aplicar(d, "(##) ####-####") : aplicar(d, "(##) #####-####");
}

/**
 * RG no padrão de SP: 00.000.000-0 (o último pode ser X). RG de outros estados, com mais dígitos ou letras,
 * fica como foi digitado.
 */
export function mascaraRg(valor: string | null | undefined) {
  const bruto = (valor ?? "").trim();
  const limpo = bruto.toUpperCase().replace(/[^0-9X]/g, "");
  // X só como último caractere (dígito verificador)
  if (!/^\d*X?$/.test(limpo) || limpo.length > 9 || /[^0-9xX.\-\s]/.test(bruto)) return bruto;
  return aplicar(limpo, "##.###.###-#").replace(/#/g, "");
}

function dvValidos(digitos: string, pesos: number[][]) {
  return pesos.every((p) => {
    const soma = p.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0);
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    return dv === Number(digitos[p.length]);
  });
}

/** Erro para mostrar no formulário, ou null se estiver vazio/válido. */
export function erroDocumento(valor: string | null | undefined, rotulo = "CPF/CNPJ") {
  const d = soDigitos(valor);
  if (!d) return null;
  if (d.length !== 11 && d.length !== 14) return `${rotulo} incompleto: confira os números.`;
  if (/^(\d)\1+$/.test(d)) return `${rotulo} inválido: confira os números.`;
  const ok =
    d.length === 11
      ? dvValidos(d, [
          [10, 9, 8, 7, 6, 5, 4, 3, 2],
          [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
        ])
      : dvValidos(d, [
          [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
          [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        ]);
  return ok ? null : `${rotulo} inválido: confira os números.`;
}

export function erroTelefone(valor: string | null | undefined) {
  let d = soDigitos(valor);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (!d) return null;
  return d.length === 10 || d.length === 11 ? null : "Telefone incompleto: use DDD + número, ex.: (11) 99999-9999.";
}

/** Para exibir/imprimir: CPF/CNPJ completo sai formatado; qualquer outra coisa fica como estava. */
export function formatarDocumento(valor: string | null | undefined) {
  const d = soDigitos(valor);
  return d.length === 11 || d.length === 14 ? mascaraDocumento(d) : (valor ?? "").trim();
}
