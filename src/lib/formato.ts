export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moeda(centavos: number | null | undefined) {
  if (centavos == null) return "—";
  // Intl usa espaço não separável depois do "R$"; troca por espaço comum
  return formatadorMoeda.format(centavos / 100).replace(/ /g, " ");
}

/** "AAAA-MM-DD" → "DD/MM/AAAA" */
export function dataBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Aceita "150", "150,00", "1.250,50", "R$ 99,9" ou "1250.50". Retorna centavos ou null. */
export function lerValorEmCentavos(texto: FormDataEntryValue | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).replace(/R\$|\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Centavos → texto para input ("1250,50"). */
export function centavosParaCampo(centavos: number | null | undefined) {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Data de hoje no fuso local, em AAAA-MM-DD. */
export function hojeISO(agora = new Date()) {
  const fuso = agora.getTimezoneOffset() * 60000;
  return new Date(agora.getTime() - fuso).toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function isoValido(texto: string | null | undefined): texto is string {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  return !Number.isNaN(new Date(`${texto}T12:00:00Z`).getTime());
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0];
}

export function numeroRecibo(numero: number) {
  return String(numero).padStart(5, "0");
}
