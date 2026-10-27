import pytest

from app import create_app
from app.extensions import db
from app.models import Aluno, Professor


@pytest.fixture
def app(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,
            "SECRET_KEY": "teste",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'teste.db'}",
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        }
    )
    with app.app_context():
        db.create_all()
        prof = Professor(nome="Marcos Professor", email="prof@teste.com", cidade="São Paulo/SP")
        prof.definir_senha("segredo123")
        db.session.add(prof)
        for nome, email in (("Ana Souza", "ana@teste.com"), ("Bruno Lima", "bruno@teste.com")):
            aluno = Aluno(nome=nome, email=email, instrumento="Violão", dia_aula="Segunda")
            aluno.definir_senha("aluno123")
            db.session.add(aluno)
        db.session.commit()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def entrar(client, email, senha):
    return client.post("/login", data={"email": email, "senha": senha})


@pytest.fixture
def professor(client):
    entrar(client, "prof@teste.com", "segredo123")
    return client


@pytest.fixture
def ids(app):
    with app.app_context():
        return {a.email.split("@")[0]: a.id for a in Aluno.query.all()}
