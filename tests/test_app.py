import io
from datetime import date
from decimal import Decimal

from app.extensions import db
from app.models import Aluno, Material, Presenca, Professor, Recibo
from app.utils import ler_decimal, valor_por_extenso

from .conftest import entrar


def test_primeiro_acesso_cria_professor(tmp_path):
    from app import create_app

    app = create_app({"TESTING": True, "WTF_CSRF_ENABLED": False,
                      "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'novo.db'}",
                      "UPLOAD_FOLDER": str(tmp_path / "up")})
    c = app.test_client()
    assert c.get("/login").headers["Location"].endswith("/configurar")
    r = c.post("/configurar", data={"nome": "Prof", "email": "p@x.com", "senha": "123456", "confirmar": "123456"})
    assert r.status_code == 302
    with app.app_context():
        assert Professor.query.count() == 1
    # depois de criado, a tela de configuração não fica mais acessível
    assert c.get("/configurar").status_code == 302


def test_login_invalido(client):
    r = entrar(client, "prof@teste.com", "errada")
    assert "inválidos" in r.get_data(as_text=True)


def test_area_do_professor_exige_login(client):
    assert client.get("/alunos/").status_code == 302


def test_cadastro_de_aluno(professor, app):
    r = professor.post("/alunos/novo", data={"nome": "Carla Dias", "instrumento": "Piano",
                                             "valor_mensalidade": "1.250,50", "dia_aula": "Terça"})
    assert r.status_code == 302
    with app.app_context():
        carla = Aluno.query.filter_by(nome="Carla Dias").one()
        assert carla.valor_mensalidade == Decimal("1250.50")
        assert not carla.tem_acesso_portal
    assert "Carla Dias" in professor.get("/alunos/").get_data(as_text=True)


def test_cadastro_rejeita_email_duplicado(professor, app):
    r = professor.post("/alunos/novo", data={"nome": "Outra Ana", "email": "ana@teste.com"})
    assert r.status_code == 200
    assert "Já existe outro aluno" in r.get_data(as_text=True)
    with app.app_context():
        assert Aluno.query.filter_by(nome="Outra Ana").count() == 0


def test_chamada_salva_altera_e_remove(professor, app, ids):
    dia = "2026-10-26"  # segunda-feira
    pagina = professor.get(f"/chamada/?data={dia}").get_data(as_text=True)
    assert "Ana Souza" in pagina and "Bruno Lima" in pagina

    professor.post("/chamada/", data={"data": dia, f"status_{ids['ana']}": "presente",
                                      f"status_{ids['bruno']}": "falta", f"obs_{ids['bruno']}": "doente"})
    with app.app_context():
        assert {p.aluno.nome: p.status for p in Presenca.query} == {"Ana Souza": "presente", "Bruno Lima": "falta"}

    professor.post("/chamada/", data={"data": dia, f"status_{ids['ana']}": "reposicao",
                                      f"status_{ids['bruno']}": ""})
    with app.app_context():
        assert {p.aluno.nome: p.status for p in Presenca.query} == {"Ana Souza": "reposicao"}


def test_recibo_numeracao_e_pdf(professor, app, ids):
    for valor in ("150,00", "200"):
        r = professor.post("/recibos/novo", data={"aluno_id": ids["ana"], "valor": valor,
                                                  "data_pagamento": "2026-10-05", "referente": "Mensalidade",
                                                  "forma_pagamento": "Pix"})
        assert r.status_code == 302
    with app.app_context():
        recibos = Recibo.query.order_by(Recibo.numero).all()
        assert [r.numero for r in recibos] == [1, 2]
        assert recibos[1].valor == Decimal("200.00")
        rid = recibos[0].id

    pagina = professor.get(f"/recibos/{rid}").get_data(as_text=True)
    assert "cento e cinquenta reais" in pagina
    assert "wa.me" in pagina

    pdf = professor.get(f"/recibos/{rid}/pdf?baixar=1")
    assert pdf.mimetype == "application/pdf"
    assert pdf.data.startswith(b"%PDF")
    assert "recibo-00001.pdf" in pdf.headers["Content-Disposition"]


def test_recibo_valida_valor(professor, ids):
    r = professor.post("/recibos/novo", data={"aluno_id": ids["ana"], "valor": "abc",
                                              "data_pagamento": "2026-10-05", "referente": "x"})
    assert "valor válido" in r.get_data(as_text=True)


def _enviar_material(cliente, titulo, destino, alunos=(), nome="partitura.pdf"):
    return cliente.post("/materiais/novo", data={
        "titulo": titulo, "destino": destino, "alunos": [str(a) for a in alunos],
        "arquivo": (io.BytesIO(b"%PDF-1.4 conteudo"), nome),
    }, content_type="multipart/form-data")


def test_material_restrito_ao_aluno(professor, client, app, ids):
    assert _enviar_material(professor, "Só da Ana", "alguns", [ids["ana"]]).status_code == 302
    assert _enviar_material(professor, "Para todos", "todos").status_code == 302
    with app.app_context():
        so_ana = Material.query.filter_by(titulo="Só da Ana").one().id

    professor.post("/logout")
    entrar(client, "bruno@teste.com", "aluno123")
    pagina = client.get("/portal/").get_data(as_text=True)
    assert "Para todos" in pagina and "Só da Ana" not in pagina
    assert client.get(f"/portal/materiais/{so_ana}").status_code == 404

    client.post("/logout")
    entrar(client, "ana@teste.com", "aluno123")
    assert "Só da Ana" in client.get("/portal/").get_data(as_text=True)
    r = client.get(f"/portal/materiais/{so_ana}")
    assert r.status_code == 200 and r.data == b"%PDF-1.4 conteudo"
    assert "partitura.pdf" in r.headers["Content-Disposition"]


def test_material_extensao_proibida(professor, app):
    r = _enviar_material(professor, "Script", "todos", nome="virus.exe")
    assert "não permitido" in r.get_data(as_text=True)
    with app.app_context():
        assert Material.query.count() == 0


def test_material_precisa_de_destino(professor):
    r = _enviar_material(professor, "Sem ninguém", "alguns")
    assert "pelo menos um aluno" in r.get_data(as_text=True)


def test_aluno_nao_acessa_area_do_professor_nem_recibo_alheio(client, app, ids):
    with app.app_context():
        recibo = Recibo(numero=1, aluno_id=ids["ana"], valor=Decimal("100"), referente="x",
                        data_pagamento=date(2026, 10, 1))
        db.session.add(recibo)
        db.session.commit()
        rid = recibo.id

    entrar(client, "bruno@teste.com", "aluno123")
    assert client.get("/alunos/").status_code == 403
    assert client.get(f"/recibos/{rid}/pdf").status_code == 403
    assert client.get(f"/portal/recibos/{rid}").status_code == 404

    client.post("/logout")
    entrar(client, "ana@teste.com", "aluno123")
    assert client.get(f"/portal/recibos/{rid}").data.startswith(b"%PDF")


def test_aluno_inativo_nao_entra(professor, client, ids):
    professor.post(f"/alunos/{ids['bruno']}/situacao")
    professor.post("/logout")
    r = entrar(client, "bruno@teste.com", "aluno123")
    assert "inválidos" in r.get_data(as_text=True)


def test_utilitarios():
    assert ler_decimal("1.250,50") == Decimal("1250.50")
    assert ler_decimal("150") == Decimal("150.00")
    assert ler_decimal("R$ 99,9") == Decimal("99.90")
    assert ler_decimal("-5") is None
    assert ler_decimal("xyz") is None
    assert valor_por_extenso(Decimal("1250.50")) == "mil duzentos e cinquenta reais e cinquenta centavos"
