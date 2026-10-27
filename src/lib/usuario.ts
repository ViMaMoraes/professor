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
