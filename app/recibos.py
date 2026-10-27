import re
from datetime import date
from urllib.parse import quote

from flask import Blueprint, flash, redirect, render_template, request, send_file, url_for

from .auth import professor_required
from .extensions import db
from .models import Aluno, Professor, Recibo
from .recibo_pdf import gerar_pdf
from .utils import MESES, ler_data, ler_decimal, valor_por_extenso

bp = Blueprint("recibos", __name__, url_prefix="/recibos")


@bp.route("/")
@professor_required
def lista():
    aluno_id = request.args.get("aluno", type=int)
    consulta = Recibo.query
    if aluno_id:
        consulta = consulta.filter_by(aluno_id=aluno_id)
    recibos = consulta.order_by(Recibo.numero.desc()).all()
    total = sum((r.valor for r in recibos), 0)
    return render_template(
        "recibos/lista.html",
        recibos=recibos,
        total=total,
        aluno_id=aluno_id,
        alunos=Aluno.query.order_by(Aluno.nome).all(),
    )


@bp.route("/novo", methods=["GET", "POST"])
@professor_required
def novo():
    alunos = Aluno.query.filter_by(ativo=True).order_by(Aluno.nome).all()
    hoje = date.today()
    dados = {
        "aluno_id": request.args.get("aluno", type=int),
        "referente": f"Aulas de música - mensalidade de {MESES[hoje.month - 1]}/{hoje.year}",
        "data_pagamento": hoje.isoformat(),
        "forma_pagamento": "Pix",
        "valor": "",
        "observacoes": "",
    }
    if dados["aluno_id"]:
        aluno = db.session.get(Aluno, dados["aluno_id"])
        if aluno and aluno.valor_mensalidade:
            dados["valor"] = f"{aluno.valor_mensalidade:.2f}".replace(".", ",")

    if request.method == "POST":
        dados.update(request.form.to_dict())
        aluno = db.session.get(Aluno, request.form.get("aluno_id", type=int) or 0)
        valor = ler_decimal(request.form.get("valor"))
        data_pagamento = ler_data(request.form.get("data_pagamento"))
        referente = request.form.get("referente", "").strip()

        if not aluno:
            flash("Escolha o aluno.", "danger")
        elif not valor:
            flash("Informe um valor válido.", "danger")
        elif not data_pagamento:
            flash("Informe a data do pagamento.", "danger")
        elif not referente:
            flash("Informe a que se refere o pagamento.", "danger")
        else:
            recibo = Recibo(
                numero=Recibo.proximo_numero(),
                aluno=aluno,
                valor=valor,
                referente=referente,
                forma_pagamento=request.form.get("forma_pagamento") or None,
                data_pagamento=data_pagamento,
                observacoes=request.form.get("observacoes", "").strip() or None,
            )
            db.session.add(recibo)
            db.session.commit()
            flash(f"Recibo nº {recibo.numero_formatado} gerado.", "success")
            return redirect(url_for("recibos.detalhe", recibo_id=recibo.id))

    valores_alunos = {
        a.id: f"{a.valor_mensalidade:.2f}".replace(".", ",") for a in alunos if a.valor_mensalidade
    }
    return render_template(
        "recibos/form.html",
        dados=dados,
        alunos=alunos,
        formas=Recibo.FORMAS_PAGAMENTO,
        valores_alunos=valores_alunos,
    )


@bp.route("/<int:recibo_id>")
@professor_required
def detalhe(recibo_id):
    recibo = db.get_or_404(Recibo, recibo_id)
    professor = Professor.query.first()
    return render_template(
        "recibos/detalhe.html",
        recibo=recibo,
        professor=professor,
        extenso=valor_por_extenso(recibo.valor),
        link_whatsapp=_link_whatsapp(recibo, professor),
        link_email=_link_email(recibo, professor),
    )


@bp.route("/<int:recibo_id>/pdf")
@professor_required
def pdf(recibo_id):
    recibo = db.get_or_404(Recibo, recibo_id)
    return enviar_pdf(recibo, baixar=request.args.get("baixar") == "1")


@bp.route("/<int:recibo_id>/excluir", methods=["POST"])
@professor_required
def excluir(recibo_id):
    recibo = db.get_or_404(Recibo, recibo_id)
    numero = recibo.numero_formatado
    db.session.delete(recibo)
    db.session.commit()
    flash(f"Recibo nº {numero} excluído.", "warning")
    return redirect(url_for("recibos.lista"))


def enviar_pdf(recibo, baixar=False):
    arquivo = gerar_pdf(recibo, Professor.query.first())
    return send_file(
        arquivo,
        mimetype="application/pdf",
        as_attachment=baixar,
        download_name=f"recibo-{recibo.numero_formatado}.pdf",
    )


def _mensagem(recibo, professor):
    from . import formatar_moeda

    return (
        f"Olá, {recibo.aluno.nome}! Segue o recibo nº {recibo.numero_formatado} "
        f"no valor de {formatar_moeda(recibo.valor)}, referente a: {recibo.referente}. "
        f"Pagamento em {recibo.data_pagamento.strftime('%d/%m/%Y')}. Obrigado!"
        + (f"\n{professor.nome}" if professor else "")
    )


def _link_whatsapp(recibo, professor):
    telefone = re.sub(r"\D", "", recibo.aluno.telefone or "")
    if telefone and len(telefone) <= 11:
        telefone = "55" + telefone  # assume Brasil quando não tem DDI
    return f"https://wa.me/{telefone}?text={quote(_mensagem(recibo, professor))}"


def _link_email(recibo, professor):
    assunto = quote(f"Recibo nº {recibo.numero_formatado}")
    corpo = quote(_mensagem(recibo, professor))
    return f"mailto:{recibo.aluno.email or ''}?subject={assunto}&body={corpo}"
