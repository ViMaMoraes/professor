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
- **Central de downloads (Google Drive):**
  - os arquivos ficam no seu Google Drive; no site você só cola o link de compartilhamento;
  - o site reconhece arquivo, pasta ou documento do Google e avisa se o link não for do Drive;
  - cada material fica liberado para **todos os alunos** ou só para **alunos escolhidos**.
- **Configurações:** dados que saem no recibo (CPF/CNPJ, telefone, endereço, cidade) e chave Pix.

### Portal do aluno

O aluno entra com o e-mail e a senha cadastrados pelo professor e vê:

- os materiais liberados para ele, que abrem no Drive ou são baixados direto;
- os seus recibos em PDF;
- a frequência nas aulas;
- a chave Pix com botão de copiar.

Ele também pode trocar a própria senha.

Cada aluno só acessa os próprios materiais e recibos. Essa verificação acontece no servidor, em toda página, ação e download.

### Como compartilhar no Drive

1. No Drive, clique com o botão direito no arquivo ou na pasta e escolha **Compartilhar**.
2. Em "Acesso geral", escolha **Qualquer pessoa com o link**, com permissão de **Leitor**.
3. Clique em **Copiar link** e cole no site, em *Downloads → Adicionar material*.

O link não aparece na página. O aluno clica, o site confere se ele tem permissão e só então abre o Drive.

> **Atenção:** como o arquivo fica acessível para quem tiver o link, um aluno que copiar o link e repassar dá acesso a outra pessoa. Para material sensível, compartilhe no Drive só com o e-mail do aluno.

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
- `data/.session-secret`: chave das sessões, gerada automaticamente.

**Faça backup dessa pasta.**

Variáveis de ambiente opcionais:

| Variável | Para quê |
| --- | --- |
| `SESSION_SECRET` | chave das sessões (recomendado em produção) |
| `DATA_DIR` | outra pasta para o banco |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | banco libSQL remoto (ex.: [Turso](https://turso.tech)) em vez do arquivo local |

> **Hospedagem:** os materiais ficam no Google Drive; o site só guarda o banco. Com um servidor que tenha disco (VPS, Railway, Render, Fly.io...) basta o arquivo SQLite. Na Vercel, use um banco libSQL na nuvem ([Turso](https://turso.tech)) com `DATABASE_URL` e `DATABASE_AUTH_TOKEN`.

## Estrutura

```
src/
  proxy.ts                 # encaminha "/" e protege rotas (checagem otimista)
  app/
    (professor)/           # painel, alunos, chamada, recibos, materiais, configurações
    portal/                # área do aluno
    login/  configurar/    # login e primeiro acesso
    api/recibos/[id]       # PDF do recibo
    api/materiais/[id]     # abre/baixa o material no Drive (com checagem de permissão)
    acoes/                 # Server Actions
  components/              # UI (botões, cards, formulários, menu)
  lib/
    db/                    # schema Drizzle e conexão (migrações rodam sozinhas)
    auth.ts  sessao.ts     # sessão em cookie JWT + checagem no banco
    consultas.ts           # consultas ao banco
    recibo-pdf.ts          # geração do PDF (pdf-lib)
    drive.ts               # leitura dos links do Google Drive
    extenso.ts  formato.ts # valor por extenso, moeda, datas
drizzle/                   # migrações SQL
```
