from datetime import date, timedelta

from flask import Blueprint, flash, redirect, render_template, request, url_for

from .alunos import DIAS_SEMANA
from .auth import professor_required
from .extensions import db
from .models import Aluno, Presenca
from .utils import ler_data

bp = Blueprint("chamada", __name__, url_prefix="/chamada")


@bp.route("/", methods=["GET", "POST"])
@professor_required
def registrar():
    dia = ler_data(request.values.get("data")) or date.today()
    mostrar_todos = request.values.get("todos") == "1"

    alunos_ativos = Aluno.query.filter_by(ativo=True).order_by(Aluno.horario, Aluno.nome).all()
    existentes = {p.aluno_id: p for p in Presenca.query.filter_by(data=dia)}

    if request.method == "POST":
        alterados = 0
        for aluno in alunos_ativos:
            status = request.form.get(f"status_{aluno.id}", "")
            observacao = request.form.get(f"obs_{aluno.id}", "").strip() or None
            registro = existentes.get(aluno.id)
            if status in Presenca.STATUS:
                if registro is None:
                    registro = Presenca(aluno=aluno, data=dia)
                    db.session.add(registro)
                registro.status = status
                registro.observacao = observacao
                alterados += 1
            elif registro is not None:
                # "sem registro" apaga a marcação existente
                db.session.delete(registro)
        db.session.commit()
        flash(f"Chamada de {dia.strftime('%d/%m/%Y')} salva ({alterados} registro(s)).", "success")
        return redirect(url_for("chamada.registrar", data=dia.isoformat(), todos="1" if mostrar_todos else None))

    dia_semana = DIAS_SEMANA[dia.weekday()]
    if mostrar_todos:
        alunos = alunos_ativos
    else:
        # por padrão mostra quem tem aula nesse dia da semana ou já tem marcação na data
        alunos = [a for a in alunos_ativos if a.dia_aula == dia_semana or a.id in existentes]

    return render_template(
        "chamada/registrar.html",
        dia=dia,
        dia_semana=dia_semana,
        alunos=alunos,
        existentes=existentes,
        mostrar_todos=mostrar_todos,
        status=Presenca.STATUS,
        anterior=dia - timedelta(days=1),
        proximo=dia + timedelta(days=1),
    )


@bp.route("/historico")
@professor_required
def historico():
    hoje = date.today()
    inicio = ler_data(request.args.get("inicio")) or hoje.replace(day=1)
    fim = ler_data(request.args.get("fim")) or hoje
    aluno_id = request.args.get("aluno", type=int)

    consulta = Presenca.query.filter(Presenca.data.between(inicio, fim))
    if aluno_id:
        consulta = consulta.filter_by(aluno_id=aluno_id)
    registros = consulta.join(Aluno).order_by(Presenca.data.desc(), Aluno.nome).all()

    totais = {chave: 0 for chave in Presenca.STATUS}
    for r in registros:
        totais[r.status] = totais.get(r.status, 0) + 1

    return render_template(
        "chamada/historico.html",
        registros=registros,
        totais=totais,
        status=Presenca.STATUS,
        inicio=inicio,
        fim=fim,
        aluno_id=aluno_id,
        alunos=Aluno.query.order_by(Aluno.nome).all(),
    )
