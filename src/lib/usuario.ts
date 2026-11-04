/** Normaliza o usuário do aluno: minúsculo, sem acento, só letras, números, ponto, hífen e sublinhado. */
export function normalizarUsuario(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._@-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}

/** Sugestão a partir do nome: "Júlia Ramos da Silva" → "julia.silva". */
export function sugerirUsuario(nome: string) {
  const partes = normalizarUsuario(nome).split(".").filter((p) => p && !["da", "de", "do", "das", "dos", "e"].includes(p));
  if (partes.length === 0) return "";
  return partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
}

/** Código do professor (vai no link e no login do aluno): minúsculo, sem acento, só letras e números. */
export function normalizarCodigo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

export const erroCodigo = (codigo: string) =>
  codigo.length < 3 ? "O código do professor precisa ter de 3 a 20 letras ou números (sem espaço nem acento)." : null;

/** Opções de código a partir do nome, da mais curta para a mais longa: "Marcus Vinicius Moraes" → marcus, marcusmoraes, mvmoraes. */
export function sugestoesDeCodigo(nome: string) {
  const partes = normalizarUsuario(nome)
    .split(".")
    .map(normalizarCodigo)
    .filter((p) => p && !["da", "de", "do", "das", "dos", "e"].includes(p));
  if (partes.length === 0) return ["professor"];
  const [primeiro] = partes;
  const ultimo = partes[partes.length - 1];
  const iniciais = partes.slice(0, -1).map((p) => p[0]).join("") + ultimo;
  const opcoes = [...new Set([primeiro, `${primeiro}${partes.length > 1 ? ultimo : ""}`, iniciais].map(normalizarCodigo).filter((c) => c.length >= 3))];
  // nome curto demais (ex.: "Li"): completa para chegar a 3 letras
  return opcoes.length ? opcoes : [normalizarCodigo(`${primeiro}prof`)];
}
