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
  "Apostila", "Exercícios", "Partitura", "Tablatura", "Áudio / Playback", "Vídeo", "Teoria", "Outros",
];
