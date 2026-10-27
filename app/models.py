from datetime import date, datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db, login_manager


class ComSenha:
    senha_hash = db.Column(db.String(255))

    def definir_senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def conferir_senha(self, senha):
        return bool(self.senha_hash) and check_password_hash(self.senha_hash, senha)


class Professor(ComSenha, UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # Dados que aparecem no recibo
    documento = db.Column(db.String(30))  # CPF ou CNPJ
    telefone = db.Column(db.String(30))
    endereco = db.Column(db.String(200))
    cidade = db.Column(db.String(80))
    chave_pix = db.Column(db.String(120))

    eh_professor = True

    def get_id(self):
        return f"p:{self.id}"


material_aluno = db.Table(
    "material_aluno",
    db.Column("material_id", db.Integer, db.ForeignKey("material.id"), primary_key=True),
    db.Column("aluno_id", db.Integer, db.ForeignKey("aluno.id"), primary_key=True),
)


class Aluno(ComSenha, UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True)
    telefone = db.Column(db.String(30))
    responsavel = db.Column(db.String(120))
    data_nascimento = db.Column(db.Date)
    instrumento = db.Column(db.String(60))
    nivel = db.Column(db.String(30))
    dia_aula = db.Column(db.String(20))
    horario = db.Column(db.String(10))
    valor_mensalidade = db.Column(db.Numeric(10, 2))
    data_inicio = db.Column(db.Date, default=date.today)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.now)

    presencas = db.relationship(
        "Presenca", back_populates="aluno", cascade="all, delete-orphan", order_by="Presenca.data.desc()"
    )
    recibos = db.relationship(
        "Recibo", back_populates="aluno", cascade="all, delete-orphan", order_by="Recibo.numero.desc()"
    )

    eh_professor = False

    def get_id(self):
        return f"a:{self.id}"

    @property
    def tem_acesso_portal(self):
        return bool(self.email and self.senha_hash)

    def materiais_disponiveis(self):
        return (
            Material.query.filter(
                db.or_(Material.para_todos.is_(True), Material.alunos.any(Aluno.id == self.id))
            )
            .order_by(Material.criado_em.desc())
            .all()
        )

    def frequencia(self):
        """Percentual de presença considerando presenças e reposições."""
        total = len(self.presencas)
        if not total:
            return None
        presentes = sum(1 for p in self.presencas if p.status in ("presente", "reposicao"))
        return round(100 * presentes / total)


class Presenca(db.Model):
    STATUS = {
        "presente": "Presente",
        "falta": "Falta",
        "justificada": "Falta justificada",
        "reposicao": "Reposição",
    }

    id = db.Column(db.Integer, primary_key=True)
    aluno_id = db.Column(db.Integer, db.ForeignKey("aluno.id"), nullable=False)
    data = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    observacao = db.Column(db.String(255))

    aluno = db.relationship("Aluno", back_populates="presencas")

    __table_args__ = (db.UniqueConstraint("aluno_id", "data"),)

    @property
    def status_texto(self):
        return self.STATUS.get(self.status, self.status)


class Recibo(db.Model):
    FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Transferência", "Cartão", "Boleto"]

    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.Integer, unique=True, nullable=False)
    aluno_id = db.Column(db.Integer, db.ForeignKey("aluno.id"), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    referente = db.Column(db.String(200), nullable=False)
    forma_pagamento = db.Column(db.String(30))
    data_pagamento = db.Column(db.Date, nullable=False, default=date.today)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.now)

    aluno = db.relationship("Aluno", back_populates="recibos")

    @staticmethod
    def proximo_numero():
        ultimo = db.session.query(db.func.max(Recibo.numero)).scalar()
        return (ultimo or 0) + 1

    @property
    def numero_formatado(self):
        return f"{self.numero:05d}"


class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    descricao = db.Column(db.Text)
    categoria = db.Column(db.String(60))
    arquivo = db.Column(db.String(80), nullable=False)  # nome salvo em disco
    nome_original = db.Column(db.String(255), nullable=False)
    tamanho = db.Column(db.Integer)
    para_todos = db.Column(db.Boolean, default=False, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.now)

    alunos = db.relationship("Aluno", secondary=material_aluno, backref="materiais_especificos")

    def disponivel_para(self, aluno):
        return self.para_todos or aluno in self.alunos


@login_manager.user_loader
def carregar_usuario(user_id):
    tipo, _, ident = user_id.partition(":")
    if not ident.isdigit():
        return None
    modelo = {"p": Professor, "a": Aluno}.get(tipo)
    if modelo is None:
        return None
    usuario = db.session.get(modelo, int(ident))
    if isinstance(usuario, Aluno) and not usuario.ativo:
        return None
    return usuario
