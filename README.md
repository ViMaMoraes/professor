# Professor 🎵: gestão de aulas de música

Sistema web para professor de música: cadastro de alunos, chamada, recibos em PDF e central de downloads com materiais liberados por aluno.

## Funcionalidades

**Área do professor**
- **Painel:** alunos ativos, chamadas do dia, valor recebido no mês e materiais recentes.
- **Alunos:** cadastro completo com contato, responsável, instrumento, nível, dia e horário da aula, mensalidade e observações. Tem busca, ativação/desativação e histórico do aluno (chamadas, recibos e materiais).
- **Chamada:** por data, mostra automaticamente quem tem aula naquele dia da semana. Opções: Presente, Falta, Falta justificada e Reposição, com observação por aluno. Inclui histórico com filtro por período e aluno.
- **Recibos:** numeração automática, valor por extenso e dados do responsável quando o aluno é menor. Gera PDF para baixar ou imprimir e tem botões de envio por **WhatsApp** e **e-mail** com mensagem pronta.
- **Central de downloads:** envio de partituras, tablaturas, áudios, vídeos, MIDI, Guitar Pro, MuseScore e outros (até 100 MB). Cada material fica disponível para **todos os alunos** ou só para **alunos escolhidos**.
- **Configurações:** seus dados para o recibo (CPF/CNPJ, telefone, endereço, cidade) e a chave Pix.

**Portal do aluno.** Aluno com e-mail e senha cadastrados pelo professor entra no mesmo site e vê:
- os materiais liberados para ele, prontos para download;
- os seus recibos em PDF;
- a frequência nas aulas;
- a chave Pix para pagamento.

Cada aluno só acessa os próprios materiais e recibos.

## Como rodar

Requer Python 3.10+.

```bash
python3 -m venv .venv
source .venv/bin/activate          # no Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app run run --debug
```

Abra http://localhost:5000. No primeiro acesso o sistema pede para criar a conta do professor.

### Dados de exemplo (opcional)

Num banco vazio:

```bash
flask --app run demo
```

O comando cria o professor `professor@exemplo.com` (senha `professor`) e os alunos `ana@exemplo.com`, `bruno@exemplo.com` etc. (senha `aluno123`).

### Testes

```bash
pip install -r requirements-dev.txt
pytest
```

## Onde ficam os dados

Tudo fica na pasta `instance/`, que não vai para o git:
- `instance/professor.db`: banco SQLite;
- `instance/uploads/`: arquivos da central de downloads;
- `instance/secret_key`: chave das sessões, gerada automaticamente.

**Faça backup dessa pasta.**

Variáveis de ambiente opcionais:
- `SECRET_KEY`;
- `DATABASE_URL`, por exemplo para usar PostgreSQL em produção.

## Estrutura

```
app/
  __init__.py      # create_app, filtros de template
  models.py        # Professor, Aluno, Presenca, Recibo, Material
  auth.py          # login, primeiro acesso, permissões
  alunos.py  chamada.py  recibos.py  materiais.py  portal.py  configuracoes.py  dashboard.py
  recibo_pdf.py    # geração do PDF (reportlab)
  demo.py          # comando `flask demo`
  templates/  static/   # Bootstrap 5 incluído localmente em static/vendor
tests/
```
