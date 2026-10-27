from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

from .utils import data_por_extenso, valor_por_extenso


def gerar_pdf(recibo, professor):
    """Gera o recibo em PDF (metade superior de uma folha A4) e devolve um BytesIO."""
    from . import formatar_moeda

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setTitle(f"Recibo {recibo.numero_formatado}")
    largura, altura = A4
    margem = 2 * cm
    topo = altura - margem
    util = largura - 2 * margem

    # moldura
    c.setStrokeColor(colors.HexColor("#4b2e83"))
    c.setLineWidth(1.5)
    c.roundRect(margem, altura / 2 + 0.5 * cm, util, altura / 2 - margem - 0.5 * cm, 8)

    # cabeçalho
    c.setFillColor(colors.HexColor("#4b2e83"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(margem + 0.8 * cm, topo - 1.4 * cm, "RECIBO")
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.black)
    c.drawString(margem + 0.8 * cm, topo - 2.0 * cm, f"Nº {recibo.numero_formatado}")

    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(largura - margem - 0.8 * cm, topo - 1.4 * cm, formatar_moeda(recibo.valor))

    # corpo
    nome_pagador = recibo.aluno.nome
    if recibo.aluno.responsavel:
        nome_pagador = f"{recibo.aluno.responsavel} (responsável por {recibo.aluno.nome})"
    texto = (
        f"Recebi de {nome_pagador} a importância de {formatar_moeda(recibo.valor)} "
        f"({valor_por_extenso(recibo.valor)}), referente a {recibo.referente}"
        + (f", pago via {recibo.forma_pagamento}" if recibo.forma_pagamento else "")
        + "."
    )
    if recibo.observacoes:
        texto += f" {recibo.observacoes}"

    c.setFont("Helvetica", 12)
    y = topo - 3.4 * cm
    for linha in simpleSplit(texto, "Helvetica", 12, util - 1.6 * cm):
        c.drawString(margem + 0.8 * cm, y, linha)
        y -= 0.65 * cm

    # local e data
    cidade = (professor.cidade + ", ") if professor and professor.cidade else ""
    y -= 0.6 * cm
    c.drawRightString(
        largura - margem - 0.8 * cm, y, f"{cidade}{data_por_extenso(recibo.data_pagamento)}."
    )

    # assinatura
    y_assinatura = altura / 2 + 3.2 * cm
    centro = largura / 2
    c.line(centro - 6 * cm, y_assinatura, centro + 6 * cm, y_assinatura)
    c.setFont("Helvetica-Bold", 11)
    nome_prof = professor.nome if professor else ""
    c.drawCentredString(centro, y_assinatura - 0.5 * cm, nome_prof)
    c.setFont("Helvetica", 9)
    detalhes = []
    if professor and professor.documento:
        detalhes.append(f"CPF/CNPJ: {professor.documento}")
    if professor and professor.telefone:
        detalhes.append(f"Tel: {professor.telefone}")
    if detalhes:
        c.drawCentredString(centro, y_assinatura - 1.0 * cm, "  •  ".join(detalhes))
    if professor and professor.endereco:
        c.drawCentredString(centro, y_assinatura - 1.45 * cm, professor.endereco)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
