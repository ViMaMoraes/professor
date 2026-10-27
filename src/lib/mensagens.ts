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
