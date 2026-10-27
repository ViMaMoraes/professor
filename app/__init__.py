import os
import secrets
from datetime import date
from decimal import Decimal

from flask import Flask, redirect, url_for
from flask_login import current_user

from .extensions import csrf, db, login_manager


def create_app(config=None):
    app = Flask(__name__, instance_relative_config=True)
    os.makedirs(app.instance_path, exist_ok=True)

    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY"),
        SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL")
        or "sqlite:///" + os.path.join(app.instance_path, "professor.db"),
        UPLOAD_FOLDER=os.path.join(app.instance_path, "uploads"),
        MAX_CONTENT_LENGTH=100 * 1024 * 1024,  # 100 MB por upload
    )
    if config:
        app.config.update(config)
    if not app.config["SECRET_KEY"]:
        app.config["SECRET_KEY"] = _secret_key_local(app.instance_path)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    csrf.init_app(app)
    login_manager.init_app(app)

    from . import alunos, auth, chamada, configuracoes, dashboard, materiais, portal, recibos

    for modulo in (auth, dashboard, alunos, chamada, recibos, materiais, portal, configuracoes):
        app.register_blueprint(modulo.bp)

    @app.route("/")
    def index():
        if current_user.is_authenticated:
            if current_user.eh_professor:
                return redirect(url_for("dashboard.inicio"))
            return redirect(url_for("portal.inicio"))
        return redirect(url_for("auth.login"))

    app.jinja_env.filters["moeda"] = formatar_moeda
    app.jinja_env.filters["data"] = formatar_data
    app.jinja_env.filters["tamanho"] = formatar_tamanho

    from .demo import comando_demo

    app.cli.add_command(comando_demo)

    with app.app_context():
        db.create_all()

    return app


def _secret_key_local(instance_path):
    """Gera e guarda uma SECRET_KEY local para não perder sessões a cada reinício."""
    caminho = os.path.join(instance_path, "secret_key")
    if not os.path.exists(caminho):
        with open(caminho, "w") as f:
            f.write(secrets.token_hex(32))
    with open(caminho) as f:
        return f.read().strip()


def formatar_moeda(valor):
    if valor is None:
        return "-"
    texto = f"{Decimal(valor):,.2f}"
    return "R$ " + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_data(valor):
    if not valor:
        return "-"
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    return str(valor)


def formatar_tamanho(num_bytes):
    if num_bytes is None:
        return "-"
    for unidade in ("B", "KB", "MB", "GB"):
        if num_bytes < 1024 or unidade == "GB":
            return f"{num_bytes:.0f} {unidade}" if unidade == "B" else f"{num_bytes:.1f} {unidade}"
        num_bytes /= 1024
