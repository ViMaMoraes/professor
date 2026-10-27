"""Comando `flask --app run demo`: popula o banco com dados de exemplo."""
import os
import uuid
from datetime import date, timedelta
from decimal import Decimal

import click
from flask import current_app

from .extensions import db
from .models import Aluno, Material, Presenca, Professor, Recibo


@click.command("demo")
def comando_demo():
    if Professor.query.count():
        click.echo("O banco já tem dados; o demo só roda num banco vazio.")
        return

    prof = Professor(nome="Professor Exemplo", email="professor@exemplo.com", documento="123.456.789-00",
                     telefone="(11) 99999-0000", cidade="São Paulo/SP", chave_pix="professor@exemplo.com")
    prof.definir_senha("professor")
    db.session.add(prof)

    dados = [
        ("Ana Souza", "Violão", "Iniciante", "Segunda", "18:00", "180", None),
        ("Bruno Lima", "Guitarra", "Intermediário", "Segunda", "19:00", "200", None),
        ("Carla Dias", "Piano", "Básico", "Quarta", "17:00", "220", "Marina Dias"),
        ("Diego Alves", "Bateria", "Avançado", "Sábado", "10:00", "250", None),
    ]
    alunos = []
    for i, (nome, inst, nivel, dia, hora, valor, resp) in enumerate(dados, 1):
        aluno = Aluno(nome=nome, instrumento=inst, nivel=nivel, dia_aula=dia, horario=hora,
                      valor_mensalidade=Decimal(valor), responsavel=resp, telefone=f"(11) 98888-000{i}",
                      email=f"{nome.split()[0].lower()}@exemplo.com", data_inicio=date.today() - timedelta(days=90 * i))
        aluno.definir_senha("aluno123")
        alunos.append(aluno)
    db.session.add_all(alunos)

    hoje = date.today()
    segunda = hoje - timedelta(days=hoje.weekday())
    for semanas in range(1, 5):
        dia = segunda - timedelta(weeks=semanas)
        db.session.add(Presenca(aluno=alunos[0], data=dia, status="presente"))
        db.session.add(Presenca(aluno=alunos[1], data=dia, status="falta" if semanas == 2 else "presente"))

    for numero, aluno in enumerate(alunos[:3], 1):
        db.session.add(Recibo(numero=numero, aluno=aluno, valor=aluno.valor_mensalidade,
                              referente="Aulas de música - mensalidade", forma_pagamento="Pix",
                              data_pagamento=hoje.replace(day=5) if hoje.day >= 5 else hoje))

    for titulo, cat, para_todos, destino in (
        ("Escalas maiores - guia", "Teoria", True, []),
        ("Asa Branca - cifra", "Partitura", False, [alunos[0]]),
    ):
        nome_salvo = f"{uuid.uuid4().hex}.txt"
        caminho = os.path.join(current_app.config["UPLOAD_FOLDER"], nome_salvo)
        with open(caminho, "w") as f:
            f.write(f"{titulo}\n(arquivo de exemplo)\n")
        db.session.add(Material(titulo=titulo, categoria=cat, para_todos=para_todos, alunos=destino,
                                arquivo=nome_salvo, nome_original=f"{titulo}.txt", tamanho=os.path.getsize(caminho)))

    db.session.commit()
    click.echo("Pronto! Professor: professor@exemplo.com / professor · Alunos: ana@exemplo.com (etc.) / aluno123")
