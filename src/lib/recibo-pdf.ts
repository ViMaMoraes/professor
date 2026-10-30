import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

import type { Professor, Recibo } from "./db/schema";
import { valorPorExtenso } from "./extenso";
import { MESES, moeda, numeroRecibo } from "./formato";
import { formatarDocumento, mascaraRg, soDigitos } from "./mascaras";
import { referenteA, type Pagador } from "./pagador";

const CINZA = rgb(0.45, 0.45, 0.45);
const PRETO = rgb(0.1, 0.1, 0.1);

export type ProfessorRecibo = Pick<Professor, "nome" | "documento" | "rg" | "endereco" | "cidade" | "assinatura">;

const RUAS = /^(rua|r\.|avenida|av\.?|travessa|alameda|estrada|rodovia|praça|praca|rodovia)\s/i;

/**
 * Texto do recibo, no modelo:
 * "Eu, Nome, CPF: ..., RG: ..., residente na Rua ... - Cidade/UF, recebi da Instituição X a quantia de
 * R$ 800,00 (oitocentos reais) referente às aulas de violino."
 */
export function textoRecibo(recibo: Recibo, pagador: Pick<Pagador, "recebiDe">, professor: ProfessorRecibo | undefined) {
  const partes: string[] = [];
  if (professor) {
    partes.push(`Eu, ${professor.nome}`);
    if (professor.documento) {
      const documento = formatarDocumento(professor.documento);
      partes.push(`${soDigitos(documento).length === 14 ? "CNPJ" : "CPF"}: ${documento}`);
    }
    if (professor.rg) partes.push(`RG: ${mascaraRg(professor.rg)}`);
    if (professor.endereco) {
      const local = professor.cidade ? `${professor.endereco} - ${professor.cidade}` : professor.endereco;
      partes.push(`${RUAS.test(professor.endereco) ? "residente na" : "residente em"} ${local}`);
    }
  }
  const quem = partes.length ? `${partes.join(", ")}, recebi` : "Recebi";
  let texto =
    `${quem} ${pagador.recebiDe} a quantia de ${moeda(recibo.valorCentavos)} ` +
    `(${valorPorExtenso(recibo.valorCentavos)}) ${referenteA(recibo.referente)}.`;
  if (recibo.observacoes) texto += ` ${recibo.observacoes}`;
  return texto.replace(/,,/g, ",");
}

/** "Salto, 10 de Março de 2026." (a cidade sem a UF, como no modelo) */
export function linhaDataRecibo(dataISO: string, cidade: string | null | undefined) {
  const [a, m, d] = dataISO.slice(0, 10).split("-").map(Number);
  const mes = MESES[m - 1];
  const data = `${d} de ${mes[0].toUpperCase() + mes.slice(1)} de ${a}`;
  const lugar = cidade?.split("/")[0].trim();
  return `${lugar ? lugar + ", " : ""}${data}.`;
}

function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Recibo em folha A4, no layout do modelo: título, texto, local e data, assinatura. */
export async function gerarReciboPdf(recibo: Recibo, pagador: Pagador, professor: ProfessorRecibo | undefined) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Recibo ${numeroRecibo(recibo.numero)}`);
  pdf.setAuthor(professor?.nome ?? "");
  const pagina = pdf.addPage([595.28, 841.89]); // A4 em pontos
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width: L, height: A } = pagina.getSize();
  const margem = 72;
  const util = L - 2 * margem;
  let y = A - 90;

  // título centralizado e número discreto à direita
  const titulo = "RECIBO";
  pagina.drawText(titulo, { x: (L - negrito.widthOfTextAtSize(titulo, 14)) / 2, y, size: 14, font: negrito, color: PRETO });
  const numero = `Nº ${numeroRecibo(recibo.numero)}`;
  pagina.drawText(numero, { x: L - margem - normal.widthOfTextAtSize(numero, 9), y: y + 2, size: 9, font: normal, color: CINZA });

  // corpo
  y -= 60;
  for (const linha of quebrarLinhas(textoRecibo(recibo, pagador, professor), normal, 12, util)) {
    pagina.drawText(linha, { x: margem, y, size: 12, font: normal, color: PRETO });
    y -= 18;
  }

  // local e data
  y -= 36;
  pagina.drawText(linhaDataRecibo(recibo.dataPagamento, professor?.cidade), { x: margem, y, size: 12, font: normal, color: PRETO });

  // assinatura: imagem (se houver) em cima da linha
  y -= 110;
  const larguraLinha = 210;
  if (professor?.assinatura?.startsWith("data:image/png;base64,")) {
    try {
      const imagem = await pdf.embedPng(professor.assinatura);
      const escala = Math.min(larguraLinha / imagem.width, 70 / imagem.height);
      pagina.drawImage(imagem, { x: margem, y: y + 2, width: imagem.width * escala, height: imagem.height * escala });
    } catch {
      // imagem inválida: o recibo sai com a linha em branco para assinar à mão
    }
  }
  pagina.drawLine({ start: { x: margem, y }, end: { x: margem + larguraLinha, y }, thickness: 0.8, color: PRETO });
  pagina.drawText(professor?.nome ?? "Assinatura", { x: margem, y: y - 15, size: 11, font: normal, color: PRETO });

  return pdf.save();
}
