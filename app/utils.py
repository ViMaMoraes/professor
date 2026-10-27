from datetime import date, datetime
from decimal import Decimal, InvalidOperation


def ler_decimal(texto):
    """Aceita '150', '150,00', '1.250,50' ou '1250.50'."""
    if texto is None:
        return None
    texto = str(texto).strip().replace("R$", "").replace(" ", "")
    if not texto:
        return None
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        valor = Decimal(texto)
    except InvalidOperation:
        return None
    return valor.quantize(Decimal("0.01")) if valor >= 0 else None


def ler_data(texto):
    if not texto:
        return None
    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto.strip(), formato).date()
        except ValueError:
            continue
    return None


def valor_por_extenso(valor):
    from num2words import num2words

    texto = num2words(Decimal(valor), lang="pt_BR", to="currency")
    return texto.replace(",", "")


MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def data_por_extenso(d: date):
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"
