import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import type { Aluno, Professor, Recibo } from "./db/schema";
import { valorPorExtenso } from "./extenso";
import { dataPorExtenso, moeda, numeroRecibo } from "./formato";

const ROXO = rgb(0.36, 0.2, 0.7);
const CINZA = rgb(0.4, 0.4, 0.45);
const PRETO = rgb(0.1, 0.1, 0.12);

/** Texto completo do recibo; usado no PDF e na pré-visualização da página. */
export function textoRecibo(recibo: Recibo, aluno: Aluno) {
  const pagador = aluno.responsavel ? `${aluno.responsavel} (responsável por ${aluno.nome})` : aluno.nome;
  let texto =
    `Recebi de ${pagador} a importância de ${moeda(recibo.valorCentavos)} ` +
    `(${valorPorExtenso(recibo.valorCentavos)}), referente a ${recibo.referente}` +
    (recibo.formaPagamento ? `, pago via ${recibo.formaPagamento}` : "") +
    ".";
  if (recibo.observacoes) texto += ` ${recibo.observacoes}`;
  return texto;
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

function centralizado(pagina: PDFPage, texto: string, y: number, fonte: PDFFont, tamanho: number, cor = PRETO) {
  const largura = fonte.widthOfTextAtSize(texto, tamanho);
  pagina.drawText(texto, { x: (pagina.getWidth() - largura) / 2, y, size: tamanho, font: fonte, color: cor });
}

/** Gera o recibo na metade de cima de uma folha A4. */
export async function gerarReciboPdf(recibo: Recibo, aluno: Aluno, professor: Professor | undefined) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Recibo ${numeroRecibo(recibo.numero)}`);
  pdf.setAuthor(professor?.nome ?? "");
  const pagina = pdf.addPage([595.28, 841.89]); // A4 em pontos
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width: L, height: A } = pagina.getSize();
  const margem = 56;
  const topo = A - margem;
  const base = A / 2 + 14;
  const util = L - 2 * margem;
  const pad = 24;

  pagina.drawRectangle({
    x: margem,
    y: base,
    width: util,
    height: topo - base,
    borderColor: ROXO,
    borderWidth: 1.5,
  });

  // cabeçalho
  pagina.drawText("RECIBO", { x: margem + pad, y: topo - 44, size: 24, font: negrito, color: ROXO });
  pagina.drawText(`Nº ${numeroRecibo(recibo.numero)}`, { x: margem + pad, y: topo - 62, size: 11, font: normal, color: CINZA });
  const valor = moeda(recibo.valorCentavos);
  pagina.drawText(valor, {
    x: L - margem - pad - negrito.widthOfTextAtSize(valor, 18),
    y: topo - 44,
    size: 18,
    font: negrito,
    color: PRETO,
  });

  // corpo
  let y = topo - 104;
  for (const linha of quebrarLinhas(textoRecibo(recibo, aluno), normal, 12, util - 2 * pad)) {
    pagina.drawText(linha, { x: margem + pad, y, size: 12, font: normal, color: PRETO });
    y -= 19;
  }

  // local e data
  const local = `${professor?.cidade ? professor.cidade + ", " : ""}${dataPorExtenso(recibo.dataPagamento)}.`;
  y -= 14;
  pagina.drawText(local, { x: L - margem - pad - normal.widthOfTextAtSize(local, 12), y, size: 12, font: normal, color: PRETO });

  // assinatura
  const yAssinatura = base + 92;
  pagina.drawLine({
    start: { x: L / 2 - 170, y: yAssinatura },
    end: { x: L / 2 + 170, y: yAssinatura },
    thickness: 0.8,
    color: PRETO,
  });
  if (professor) {
    centralizado(pagina, professor.nome, yAssinatura - 16, negrito, 11);
    const detalhes = [
      professor.documento && `CPF/CNPJ: ${professor.documento}`,
      professor.telefone && `Tel: ${professor.telefone}`,
    ].filter(Boolean);
    if (detalhes.length) centralizado(pagina, detalhes.join("  •  "), yAssinatura - 31, normal, 9, CINZA);
    if (professor.endereco) centralizado(pagina, professor.endereco, yAssinatura - 44, normal, 9, CINZA);
  }

  return pdf.save();
}
