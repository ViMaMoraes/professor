from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user

from .auth import professor_required
from .extensions import db
from .models import Aluno, Professor

bp = Blueprint("configuracoes", __name__, url_prefix="/configuracoes")


@bp.route("/", methods=["GET", "POST"])
@professor_required
def editar():
    prof = current_user
    if request.method == "POST":
        f = request.form
        nome = f.get("nome", "").strip()
        email = f.get("email", "").strip().lower()
        nova_senha = f.get("nova_senha", "")

        if not nome or not email:
            flash("Nome e e-mail são obrigatórios.", "danger")
        elif Professor.query.filter(Professor.email == email, Professor.id != prof.id).first() or (
            Aluno.query.filter_by(email=email).first()
        ):
            flash("Esse e-mail já está em uso.", "danger")
        elif nova_senha and len(nova_senha) < 6:
            flash("A nova senha precisa ter pelo menos 6 caracteres.", "danger")
        elif nova_senha and not prof.conferir_senha(f.get("senha_atual", "")):
            flash("Para trocar a senha, informe a senha atual corretamente.", "danger")
        else:
            prof.nome = nome
            prof.email = email
            for campo in ("documento", "telefone", "endereco", "cidade", "chave_pix"):
                setattr(prof, campo, f.get(campo, "").strip() or None)
            if nova_senha:
                prof.definir_senha(nova_senha)
            db.session.commit()
            flash("Configurações salvas.", "success")
            return redirect(url_for("configuracoes.editar"))
    return render_template("configuracoes.html", prof=prof)
