# Professor 🎵: gestão de aulas de música

Site para professor de música, com cadastro de alunos, chamada, recibos em PDF e central de downloads com materiais liberados por aluno. Os alunos têm um portal próprio.

Feito com **Next.js 16** (App Router, Server Actions, Cache Components), **React 19**, **Tailwind CSS 4**, **Drizzle ORM** e **SQLite/libSQL**.

## Funcionalidades

### Área do professor

- **Painel:** alunos ativos, chamadas do dia, valor recebido no mês, gráfico dos últimos 6 meses, aulas de hoje e últimos recibos.
- **Alunos:**
  - cadastro com contato, responsável, instrumento, nível, dia e horário, mensalidade e observações;
  - busca e filtro por situação;
  - página do aluno com histórico de aulas, recibos, materiais e frequência.
- **Chamada:**
  - por data, já mostrando quem tem aula naquele dia da semana;
  - situações Presente, Falta, Falta justificada e Reposição, com anotação da aula;
  - botão "todos presentes";
  - histórico com filtros e totais.
- **Recibos:**
  - numeração automática;
  - valor por extenso;
  - nome do responsável quando o aluno é menor;
  - PDF para baixar ou imprimir;
  - envio por **WhatsApp** ou **e-mail** com mensagem pronta;
  - no celular, botão **Compartilhar PDF**, que manda o arquivo direto pelo WhatsApp.
- **Central de downloads:** envio de partituras, tablaturas, áudios, vídeos, MIDI, Guitar Pro, MuseScore, ZIP e outros (até 100 MB). Cada material fica liberado para **todos os alunos** ou só para **alunos escolhidos**.
- **Configurações:** dados que saem no recibo (CPF/CNPJ, telefone, endereço, cidade) e chave Pix.

### Portal do aluno

O aluno entra com o e-mail e a senha cadastrados pelo professor e vê:

- os materiais liberados para ele;
- os seus recibos em PDF;
- a frequência nas aulas;
- a chave Pix com botão de copiar.

Ele também pode trocar a própria senha.

Cada aluno só acessa os próprios materiais e recibos. Essa verificação acontece no servidor, em toda página, ação e download.

Modo escuro automático (segue o sistema) e layout pensado para celular.

## Como rodar

Requer **Node.js 20.9+**.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. No primeiro acesso o site pede para criar a conta do professor. O banco é criado sozinho.

### Dados de exemplo (opcional)

Num banco vazio:

```bash
npm run demo
```

O comando cria:

- o professor `professor@exemplo.com`, senha `professor`;
- os alunos `ana@exemplo.com`, `bruno@exemplo.com` etc., senha `aluno123`.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm test` | testes (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript |
| `npm run db:generate` | gera migração depois de mudar `src/lib/db/schema.ts` |
| `npm run demo` | popula um banco vazio com exemplos |

## Onde ficam os dados

Por padrão tudo fica em `data/`, que não vai para o git:

- `data/professor.db`: banco SQLite;
- `data/uploads/`: arquivos da central de downloads;
- `data/.session-secret`: chave das sessões, gerada automaticamente.

**Faça backup dessa pasta.**

Variáveis de ambiente opcionais:

| Variável | Para quê |
| --- | --- |
| `SESSION_SECRET` | chave das sessões (recomendado em produção) |
| `DATA_DIR` | outra pasta para banco e uploads |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | banco libSQL remoto (ex.: [Turso](https://turso.tech)) em vez do arquivo local |

> **Hospedagem:** os uploads são gravados em disco, então o site precisa de um servidor com disco persistente (VPS, Railway, Render, Fly.io...). Para usar Vercel, troque o armazenamento dos uploads por um serviço de arquivos (Vercel Blob, S3, R2) e o banco por Turso.

## Estrutura

```
src/
  proxy.ts                 # encaminha "/" e protege rotas (checagem otimista)
  app/
    (professor)/           # painel, alunos, chamada, recibos, materiais, configurações
    portal/                # área do aluno
    login/  configurar/    # login e primeiro acesso
    api/recibos/[id]       # PDF do recibo
    api/materiais/[id]     # download de material (com checagem de permissão)
    acoes/                 # Server Actions
  components/              # UI (botões, cards, formulários, menu)
  lib/
    db/                    # schema Drizzle e conexão (migrações rodam sozinhas)
    auth.ts  sessao.ts     # sessão em cookie JWT + checagem no banco
    consultas.ts           # consultas ao banco
    recibo-pdf.ts          # geração do PDF (pdf-lib)
    extenso.ts  formato.ts # valor por extenso, moeda, datas
drizzle/                   # migrações SQL
```
