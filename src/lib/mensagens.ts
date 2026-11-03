import { dataBR, moeda, numeroRecibo } from "./formato";

type DadosMensagem = {
  numero: number;
  valorCentavos: number;
  referente: string;
  dataPagamento: string;
  pagador: string;
  professor?: string;
};

export function mensagemRecibo(d: DadosMensagem) {
  return (
    `Olá, ${d.pagador}! Segue o recibo nº ${numeroRecibo(d.numero)} no valor de ${moeda(d.valorCentavos)}, ` +
    `referente a ${d.referente}. Pagamento em ${dataBR(d.dataPagamento)}. Obrigado!` +
    (d.professor ? `\n${d.professor}` : "")
  );
}

export function linkWhatsapp(telefone: string | null, mensagem: string) {
  let numero = (telefone ?? "").replace(/\D/g, "");
  if (numero && numero.length <= 11) numero = "55" + numero; // sem DDI: assume Brasil
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function linkEmail(email: string | null, assunto: string, mensagem: string) {
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
}

type DadosCobranca = {
  /** aluno ou instituição */
  nome: string;
  tipo: "aluno" | "instituicao";
  /** responsável do aluno ou contato da instituição (é com quem se fala) */
  contato?: string | null;
  mes: string; // "novembro de 2026"
  faltaCentavos: number;
  /** já pagou uma parte */
  parcial: boolean;
  vencimento: string; // AAAA-MM-DD
  atrasado: boolean;
  chavePix?: string | null;
  professor?: string;
};

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];

/** Lembrete de cobrança educado (WhatsApp): a vencer ou em atraso, com a chave Pix se houver. */
export function mensagemCobranca(d: DadosCobranca) {
  const saudacao = d.contato ? primeiro(d.contato) : d.tipo === "aluno" ? primeiro(d.nome) : d.nome;
  // com o responsável ou o contato, deixa claro de quem é a mensalidade
  const de = d.contato ? (d.tipo === "aluno" ? ` de ${primeiro(d.nome)}` : ` da ${d.nome}`) : "";
  const data = dataBR(d.vencimento);
  const lembrete = d.parcial
    ? `ainda falta ${moeda(d.faltaCentavos)} da mensalidade de ${d.mes}${de}, ${d.atrasado ? `que venceu em ${data}` : `com vencimento em ${data}`}`
    : `a mensalidade de ${d.mes}${de} (${moeda(d.faltaCentavos)}) ${d.atrasado ? "venceu" : "vence"} em ${data}`;
  return (
    `Olá, ${saudacao}! Tudo bem? Passando para lembrar que ${lembrete}.` +
    (d.chavePix ? `\n\nChave Pix: ${d.chavePix}` : "") +
    (d.atrasado ? "\n\nSe já fez o pagamento, pode desconsiderar esta mensagem." : "") +
    "\n\nObrigado!" +
    (d.professor ? `\n${d.professor}` : "")
  );
}
