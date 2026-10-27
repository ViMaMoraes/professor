from flask import Blueprint, flash, redirect, render_template, request, url_for

from .auth import professor_required
from .extensions import db
from .models import Aluno, Professor
from .utils import ler_data, ler_decimal

bp = Blueprint("alunos", __name__, url_prefix="/alunos")

DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
NIVEIS = ["Iniciante", "Básico", "Intermediário", "Avançado"]


@bp.route("/")
@professor_required
def lista():
    busca = request.args.get("q", "").strip()
    situacao = request.args.get("situacao", "ativos")
    consulta = Aluno.query
    if situacao == "ativos":
        consulta = consulta.filter_by(ativo=True)
    elif situacao == "inativos":
        consulta = consulta.filter_by(ativo=False)
    if busca:
        termo = f"%{busca}%"
        consulta = consulta.filter(
            db.or_(Aluno.nome.ilike(termo), Aluno.instrumento.ilike(termo), Aluno.email.ilike(termo))
        )
    alunos = consulta.order_by(Aluno.nome).all()
    return render_template("alunos/lista.html", alunos=alunos, busca=busca, situacao=situacao)


@bp.route("/novo", methods=["GET", "POST"])
@professor_required
def novo():
    aluno = Aluno()
    if request.method == "POST" and _preencher(aluno):
        db.session.add(aluno)
        db.session.commit()
        flash(f"Aluno {aluno.nome} cadastrado.", "success")
        return redirect(url_for("alunos.detalhe", aluno_id=aluno.id))
    return _formulario(aluno)


@bp.route("/<int:aluno_id>")
@professor_required
def detalhe(aluno_id):
    aluno = db.get_or_404(Aluno, aluno_id)
    return render_template("alunos/detalhe.html", aluno=aluno)


@bp.route("/<int:aluno_id>/editar", methods=["GET", "POST"])
@professor_required
def editar(aluno_id):
    aluno = db.get_or_404(Aluno, aluno_id)
    if request.method == "POST" and _preencher(aluno):
        db.session.commit()
        flash("Dados atualizados.", "success")
        return redirect(url_for("alunos.detalhe", aluno_id=aluno.id))
    return _formulario(aluno)


@bp.route("/<int:aluno_id>/situacao", methods=["POST"])
@professor_required
def alternar_situacao(aluno_id):
    aluno = db.get_or_404(Aluno, aluno_id)
    aluno.ativo = not aluno.ativo
    db.session.commit()
    flash(f"{aluno.nome} agora está {'ativo' if aluno.ativo else 'inativo'}.", "info")
    return redirect(url_for("alunos.detalhe", aluno_id=aluno.id))


@bp.route("/<int:aluno_id>/excluir", methods=["POST"])
@professor_required
def excluir(aluno_id):
    aluno = db.get_or_404(Aluno, aluno_id)
    nome = aluno.nome
    db.session.delete(aluno)
    db.session.commit()
    flash(f"Aluno {nome} excluído, junto com chamadas e recibos.", "warning")
    return redirect(url_for("alunos.lista"))


def _formulario(aluno):
    return render_template("alunos/form.html", aluno=aluno, dias=DIAS_SEMANA, niveis=NIVEIS)


def _preencher(aluno):
    """Copia o formulário para o aluno. Retorna False (com flash) se algo estiver inválido."""
    f = request.form
    nome = f.get("nome", "").strip()
    email = f.get("email", "").strip().lower() or None
    senha = f.get("senha", "")

    erros = []
    if not nome:
        erros.append("Informe o nome do aluno.")
    if email:
        outro = Aluno.query.filter(Aluno.email == email, Aluno.id != aluno.id).first()
        if outro:
            erros.append("Já existe outro aluno com esse e-mail.")
        elif Professor.query.filter_by(email=email).first():
            erros.append("Esse e-mail é o do professor; use outro para o aluno.")
    if senha and len(senha) < 6:
        erros.append("A senha do portal precisa ter pelo menos 6 caracteres.")
    if senha and not email:
        erros.append("Para liberar o portal, informe o e-mail do aluno.")
    valor = ler_decimal(f.get("valor_mensalidade"))
    if f.get("valor_mensalidade", "").strip() and valor is None:
        erros.append("Valor da mensalidade inválido.")

    if erros:
        for erro in erros:
            flash(erro, "danger")
        # mantém o que foi digitado na tela
        aluno.nome, aluno.email = nome, email
        return False

    aluno.nome = nome
    aluno.email = email
    aluno.telefone = f.get("telefone", "").strip() or None
    aluno.responsavel = f.get("responsavel", "").strip() or None
    aluno.data_nascimento = ler_data(f.get("data_nascimento"))
    aluno.instrumento = f.get("instrumento", "").strip() or None
    aluno.nivel = f.get("nivel") or None
    aluno.dia_aula = f.get("dia_aula") or None
    aluno.horario = f.get("horario") or None
    aluno.valor_mensalidade = valor
    aluno.data_inicio = ler_data(f.get("data_inicio")) or aluno.data_inicio
    aluno.observacoes = f.get("observacoes", "").strip() or None
    if senha:
        aluno.definir_senha(senha)
    if f.get("remover_acesso"):
        aluno.senha_hash = None
    return True
