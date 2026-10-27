import os
import uuid

from flask import Blueprint, current_app, flash, redirect, render_template, request, send_from_directory, url_for
from werkzeug.utils import secure_filename

from .auth import professor_required
from .extensions import db
from .models import Aluno, Material

bp = Blueprint("materiais", __name__, url_prefix="/materiais")

EXTENSOES_PERMITIDAS = {
    "pdf", "doc", "docx", "txt", "odt",
    "png", "jpg", "jpeg", "gif", "webp",
    "mp3", "wav", "ogg", "m4a", "flac",
    "mp4", "mov", "webm",
    "mid", "midi", "musicxml", "mxl", "mscz", "gp", "gp5", "gpx", "sib",
    "zip",
}
CATEGORIAS = ["Partitura", "Tablatura", "Áudio / Playback", "Vídeo", "Teoria", "Exercícios", "Outros"]


def extensao(nome):
    return nome.rsplit(".", 1)[-1].lower() if "." in nome else ""


@bp.route("/")
@professor_required
def lista():
    materiais = Material.query.order_by(Material.criado_em.desc()).all()
    return render_template("materiais/lista.html", materiais=materiais)


@bp.route("/novo", methods=["GET", "POST"])
@professor_required
def novo():
    material = Material(para_todos=False)
    if request.method == "POST":
        arquivo = request.files.get("arquivo")
        if not arquivo or not arquivo.filename:
            flash("Escolha um arquivo para enviar.", "danger")
        elif extensao(arquivo.filename) not in EXTENSOES_PERMITIDAS:
            flash(f"Tipo de arquivo não permitido (.{extensao(arquivo.filename)}).", "danger")
        elif _preencher(material):
            nome_salvo = f"{uuid.uuid4().hex}.{extensao(arquivo.filename)}"
            caminho = os.path.join(current_app.config["UPLOAD_FOLDER"], nome_salvo)
            arquivo.save(caminho)
            material.arquivo = nome_salvo
            material.nome_original = secure_filename(arquivo.filename) or nome_salvo
            material.tamanho = os.path.getsize(caminho)
            db.session.add(material)
            db.session.commit()
            flash(f"Material “{material.titulo}” publicado.", "success")
            return redirect(url_for("materiais.lista"))
    return _formulario(material)


@bp.route("/<int:material_id>/editar", methods=["GET", "POST"])
@professor_required
def editar(material_id):
    material = db.get_or_404(Material, material_id)
    if request.method == "POST" and _preencher(material):
        db.session.commit()
        flash("Material atualizado.", "success")
        return redirect(url_for("materiais.lista"))
    return _formulario(material)


@bp.route("/<int:material_id>/excluir", methods=["POST"])
@professor_required
def excluir(material_id):
    material = db.get_or_404(Material, material_id)
    caminho = os.path.join(current_app.config["UPLOAD_FOLDER"], material.arquivo)
    db.session.delete(material)
    db.session.commit()
    if os.path.exists(caminho):
        os.remove(caminho)
    flash("Material excluído.", "warning")
    return redirect(url_for("materiais.lista"))


@bp.route("/<int:material_id>/baixar")
@professor_required
def baixar(material_id):
    return enviar_arquivo(db.get_or_404(Material, material_id))


def enviar_arquivo(material):
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        material.arquivo,
        as_attachment=True,
        download_name=material.nome_original,
    )


def _formulario(material):
    alunos = Aluno.query.filter_by(ativo=True).order_by(Aluno.nome).all()
    return render_template("materiais/form.html", material=material, alunos=alunos, categorias=CATEGORIAS)


def _preencher(material):
    titulo = request.form.get("titulo", "").strip()
    para_todos = request.form.get("destino") == "todos"
    ids = [int(i) for i in request.form.getlist("alunos") if i.isdigit()]
    material.titulo = titulo
    material.descricao = request.form.get("descricao", "").strip() or None
    material.categoria = request.form.get("categoria") or None
    material.para_todos = para_todos
    material.alunos = [] if para_todos else Aluno.query.filter(Aluno.id.in_(ids)).all()

    if not titulo:
        flash("Informe um título para o material.", "danger")
        return False
    if not para_todos and not material.alunos:
        flash("Escolha pelo menos um aluno ou marque “Todos os alunos”.", "danger")
        return False
    return True
