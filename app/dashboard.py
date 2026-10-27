from datetime import date

from flask import Blueprint, render_template

from .auth import professor_required
from .extensions import db
from .models import Aluno, Material, Presenca, Recibo

bp = Blueprint("dashboard", __name__, url_prefix="/painel")


@bp.route("/")
@professor_required
def inicio():
    hoje = date.today()
    inicio_mes = hoje.replace(day=1)
    recebido_mes = (
        db.session.query(db.func.coalesce(db.func.sum(Recibo.valor), 0))
        .filter(Recibo.data_pagamento >= inicio_mes)
        .scalar()
    )
    resumo = {
        "alunos_ativos": Aluno.query.filter_by(ativo=True).count(),
        "chamadas_hoje": Presenca.query.filter_by(data=hoje).count(),
        "recebido_mes": recebido_mes,
        "materiais": Material.query.count(),
    }
    ultimos_recibos = Recibo.query.order_by(Recibo.numero.desc()).limit(5).all()
    ultimos_materiais = Material.query.order_by(Material.criado_em.desc()).limit(5).all()
    return render_template(
        "dashboard.html",
        resumo=resumo,
        ultimos_recibos=ultimos_recibos,
        ultimos_materiais=ultimos_materiais,
        hoje=hoje,
    )
