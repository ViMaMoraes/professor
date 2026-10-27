# Professor 🎵: gestão de aulas de música

Site para professor de música, com cadastro de alunos, chamada, recibos em PDF e central de downloads com materiais liberados por aluno. Os alunos têm um portal próprio.

Feito com **Next.js 16** (App Router, Server Actions), **React 19**, **Tailwind CSS 4** e **Drizzle ORM**, com banco **SQLite**: arquivo local no desenvolvimento e **Cloudflare D1** em produção.

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
  - histórico com filtros, atalhos (este mês, mês passado, este ano) e totais;
  - **exportação para Excel (.xlsx)** do período, com três abas:
    - **Chamada:** grade de alunos × datas com P/F/J/R coloridos, totais e frequência;
    - **Resumo:** totais e frequência por aluno;
    - **Registros:** todas as marcações, com as observações das aulas.
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
  - cada material fica liberado para **todos os alunos** ou só para **alunos escolhidos**;
  - **Ver** abre o arquivo dentro do próprio site (visualização do Drive);
  - **Baixar** baixa direto; documentos do Google vêm em PDF;
  - **download em lote:** marque vários e baixe tudo num **ZIP** (arquivos separados) ou num **PDF único** (páginas em ordem alfabética). O site avisa quais arquivos não puderam entrar.
- **Configurações:** dados que saem no recibo (CPF/CNPJ, telefone, endereço, cidade) e chave Pix.

### Portal do aluno

O aluno entra com o e-mail e a senha cadastrados pelo professor e vê:

- os materiais liberados para ele, para ver no site, baixar ou abrir no Drive, inclusive vários de uma vez em ZIP ou PDF único;
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
| `npm run preview` | build para Cloudflare e roda localmente no runtime deles (workerd + D1 local) |
| `npm run deploy` | build e publica na Cloudflare |
| `npm run cf:migrar` / `cf:migrar-local` | aplica as migrações no D1 (produção / local) |

## Colocar no ar na Cloudflare (Workers)

O site roda na Cloudflare Workers (em "Compute" no painel) usando o adaptador oficial [OpenNext](https://opennext.js.org/cloudflare) e o banco **D1**. A configuração está pronta em `wrangler.jsonc` e `open-next.config.ts`.

> **Plano:** use o **Workers Paid (US$ 5/mês)**. O plano grátis limita cada requisição a 10 ms de CPU, e só conferir a senha no login gasta cerca de 80 ms (gerar PDF, ZIP e planilha também passa disso). O tamanho do app (cerca de 1,8 MB compactado) cabe em qualquer plano.

Passo a passo, uma vez só, no seu computador:

```bash
npm install
npx wrangler login                      # abre o navegador para autorizar sua conta Cloudflare

npx wrangler d1 create professor-db     # cria o banco; copie o "database_id" que aparecer
#   → cole o id em wrangler.jsonc, no lugar de COLE-AQUI-O-ID-DO-BANCO

npm run cf:migrar                       # cria as tabelas no D1

openssl rand -hex 32                    # gera uma chave aleatória (ou invente um texto longo)
npx wrangler secret put SESSION_SECRET  # cole a chave quando pedir

npm run deploy                          # build + publicação
```

No fim aparece o endereço `https://professor.<sua-conta>.workers.dev`. Abra e crie a conta de professor, porque o banco começa vazio.

**Domínio próprio:** no painel da Cloudflare, abra *Workers & Pages → professor → Settings → Domains & Routes → Add → Custom domain*. O domínio precisa estar na sua conta Cloudflare.

**Deploy automático pelo GitHub (Workers Builds):** em *Workers & Pages → professor → Settings → Build*, conecte o repositório e configure:

| Campo | Valor |
| --- | --- |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |

> O build command **não pode** ser `npm run build`. Esse script só roda o `next build`, e o deploy falha com *"Could not find compiled Open Next config"*. Também não troque o script `build` do `package.json`: o `opennextjs-cloudflare build` chama esse script por dentro.

Antes do primeiro deploy pelo GitHub:

- o `database_id` real do D1 precisa estar no `wrangler.jsonc` commitado (o deploy usa o arquivo do repositório);
- as tabelas precisam existir: rode `npm run cf:migrar` uma vez no seu computador e de novo sempre que houver migração nova em `drizzle/`;
- o `SESSION_SECRET` precisa estar cadastrado (pelo `wrangler secret put` ou no painel, em *Settings → Variables and Secrets*, como tipo **Secret**).

**Quando o banco mudar** (nova migração em `drizzle/`), rode `npm run cf:migrar` antes do `npm run deploy`.

**Testar o build da Cloudflare localmente:**

```bash
cp .dev.vars.example .dev.vars          # define SESSION_SECRET local
npm run cf:migrar-local
npm run preview                         # http://localhost:8787
```

**Backup do D1:** `npx wrangler d1 export professor-db --remote --output backup.sql`. O D1 também tem *Time Travel*, que restaura o banco para qualquer momento dos últimos 30 dias.

## Onde ficam os dados (desenvolvimento local)

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

> **Outras hospedagens:** fora da Cloudflare o app roda como um Next.js comum (`npm run build && npm start`). Com disco persistente (VPS, Railway, Render, Fly.io...) basta o arquivo SQLite; sem disco, use um banco libSQL na nuvem ([Turso](https://turso.tech)) com `DATABASE_URL` e `DATABASE_AUTH_TOKEN`.

## Estrutura

```
src/
  app/
    (professor)/           # painel, alunos, chamada, recibos, materiais, configurações
    portal/                # área do aluno
    login/  configurar/    # login e primeiro acesso
    api/recibos/[id]       # PDF do recibo
    api/materiais/[id]     # abre/vê/baixa o material no Drive (com checagem de permissão)
    api/materiais/lote     # ZIP ou PDF único com vários materiais
    api/chamada/planilha   # exportação da chamada em Excel
    acoes/                 # Server Actions
  components/              # UI (botões, cards, formulários, menu)
  lib/
    db/                    # schema Drizzle e conexão (D1 na Cloudflare, SQLite local fora dela)
    auth.ts  sessao.ts     # sessão em cookie JWT + checagem no banco
    consultas.ts           # consultas ao banco
    recibo-pdf.ts          # geração do PDF (pdf-lib)
    drive.ts               # leitura dos links do Google Drive e endereços de ver/baixar
    drive-lote.ts          # download em lote: busca no Drive e monta ZIP ou PDF único
    planilha-chamada.ts    # monta a planilha .xlsx da chamada
    extenso.ts  formato.ts # valor por extenso, moeda, datas
drizzle/                   # migrações SQL (usadas pelo SQLite local e pelo D1)
wrangler.jsonc             # configuração da Cloudflare (worker, D1)
open-next.config.ts        # configuração do adaptador OpenNext
```
