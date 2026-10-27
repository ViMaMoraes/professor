from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user

from .auth import aluno_required
from .extensions import db
from .materiais import enviar_arquivo
from .models import Material, Professor, Recibo
from .recibos import enviar_pdf

bp = Blueprint("portal", __name__, url_prefix="/portal")


@bp.route("/")
@aluno_required
def inicio():
    aluno = current_user
    return render_template(
        "portal/inicio.html",
        aluno=aluno,
        materiais=aluno.materiais_disponiveis(),
        recibos=aluno.recibos,
        presencas=aluno.presencas[:20],
        professor=Professor.query.first(),
    )


@bp.route("/materiais/<int:material_id>")
@aluno_required
def baixar_material(material_id):
    material = db.get_or_404(Material, material_id)
    if not material.disponivel_para(current_user):
        abort(404)
    return enviar_arquivo(material)


@bp.route("/recibos/<int:recibo_id>")
@aluno_required
def recibo_pdf(recibo_id):
    recibo = db.get_or_404(Recibo, recibo_id)
    if recibo.aluno_id != current_user.id:
        abort(404)
    return enviar_pdf(recibo, baixar=True)


@bp.route("/senha", methods=["GET", "POST"])
@aluno_required
def trocar_senha():
    if request.method == "POST":
        atual = request.form.get("atual", "")
        nova = request.form.get("nova", "")
        if not current_user.conferir_senha(atual):
            flash("Senha atual incorreta.", "danger")
        elif len(nova) < 6:
            flash("A nova senha precisa ter pelo menos 6 caracteres.", "danger")
        elif nova != request.form.get("confirmar"):
            flash("As senhas não conferem.", "danger")
        else:
            current_user.definir_senha(nova)
            db.session.commit()
            flash("Senha alterada.", "success")
            return redirect(url_for("portal.inicio"))
    return render_template("portal/senha.html")
