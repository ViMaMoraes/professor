import type { StatusPresenca } from "./db/schema";

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const NIVEIS = ["Iniciante", "Básico", "Intermediário", "Avançado"];

export const INSTRUMENTOS = [
  "Violão", "Guitarra", "Contrabaixo", "Piano", "Teclado", "Bateria", "Canto",
  "Ukulele", "Violino", "Flauta", "Saxofone", "Cavaquinho", "Teoria musical",
];

export const STATUS_PRESENCA: Record<StatusPresenca, { nome: string; sigla: string }> = {
  presente: { nome: "Presente", sigla: "P" },
  falta: { nome: "Falta", sigla: "F" },
  justificada: { nome: "Falta justificada", sigla: "J" },
  reposicao: { nome: "Reposição", sigla: "R" },
};

export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Transferência", "Cartão", "Boleto"];

export const CATEGORIAS_MATERIAL = [
  "Partitura", "Tablatura", "Áudio / Playback", "Vídeo", "Teoria", "Exercícios", "Outros",
];

export const EXTENSOES_PERMITIDAS = new Set([
  "pdf", "doc", "docx", "txt", "odt",
  "png", "jpg", "jpeg", "gif", "webp",
  "mp3", "wav", "ogg", "m4a", "flac",
  "mp4", "mov", "webm",
  "mid", "midi", "musicxml", "mxl", "mscz", "gp", "gp5", "gpx", "sib",
  "zip",
]);

export const TAMANHO_MAXIMO_UPLOAD = 100 * 1024 * 1024;
