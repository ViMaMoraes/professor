const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos",
  "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/** Escreve 0–999 por extenso. */
function ate999(n: number): string {
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c) partes.push(CENTENAS[c]);
  if (resto) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

/** Escreve um inteiro (até 999.999.999) por extenso. */
export function numeroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const grupos: string[] = [];
  if (milhoes) grupos.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) grupos.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) grupos.push(ate999(resto));

  if (grupos.length === 1) return grupos[0];
  // usa "e" antes do último grupo quando ele é < 100 ou uma centena redonda (ex.: "mil e cem", "mil e vinte")
  const ultimo = grupos[grupos.length - 1];
  const usaE = resto > 0 && (resto < 100 || resto % 100 === 0);
  if (usaE) return `${grupos.slice(0, -1).join(" ")} e ${ultimo}`;
  return grupos.join(" ");
}

/** 125050 (centavos) → "mil duzentos e cinquenta reais e cinquenta centavos" */
export function valorPorExtenso(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const cents = centavos % 100;
  const partes: string[] = [];
  if (reais) {
    const exato = reais % 1_000_000 === 0; // "um milhão de reais"
    partes.push(`${numeroPorExtenso(reais)}${exato ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cents) partes.push(`${numeroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero reais";
}
