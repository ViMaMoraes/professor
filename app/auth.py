from functools import wraps

from flask import Blueprint, abort, flash, redirect, render_template, request, session, url_for
from flask_login import current_user, login_required, login_user, logout_user

from .extensions import db
from .models import Aluno, Professor

bp = Blueprint("auth", __name__)


def professor_required(view):
    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user.eh_professor:
            abort(403)
        return view(*args, **kwargs)

    return wrapper


def aluno_required(view):
    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user.eh_professor:
            return redirect(url_for("dashboard.inicio"))
        return view(*args, **kwargs)

    return wrapper


@bp.route("/login", methods=["GET", "POST"])
def login():
    if Professor.query.count() == 0:
        return redirect(url_for("auth.configurar"))
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        usuario = Professor.query.filter_by(email=email).first() or Aluno.query.filter_by(
            email=email, ativo=True
        ).first()
        if usuario and usuario.conferir_senha(senha):
            login_user(usuario, remember=bool(request.form.get("lembrar")))
            return redirect(url_for("index"))
        flash("E-mail ou senha inválidos.", "danger")

    return render_template("auth/login.html")


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()
    flash("Você saiu do sistema.", "info")
    return redirect(url_for("auth.login"))


@bp.route("/configurar", methods=["GET", "POST"])
def configurar():
    """Primeiro acesso: cria a conta do professor."""
    if Professor.query.count() > 0:
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        if not nome or not email or len(senha) < 6:
            flash("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.", "danger")
        elif request.form.get("confirmar") != senha:
            flash("As senhas não conferem.", "danger")
        else:
            professor = Professor(nome=nome, email=email)
            professor.definir_senha(senha)
            db.session.add(professor)
            db.session.commit()
            login_user(professor)
            flash("Conta criada! Complete seus dados para os recibos em Configurações.", "success")
            return redirect(url_for("dashboard.inicio"))

    return render_template("auth/configurar.html")
