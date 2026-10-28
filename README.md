# Portal de Aulas: acesso professor e acesso aluno

Site para professores (de qualquer matéria) com cadastro de alunos, chamada, recibos em PDF assinados e central de downloads com materiais liberados por aluno. Os alunos entram só com um usuário e veem os downloads e avisos. Funciona como app no celular (PWA) e manda notificações.

O nome que aparece no site é "Portal de Aulas"; para trocar, defina a variável `NEXT_PUBLIC_NOME_APP` no build.

Feito com **Next.js 16** (App Router, Server Actions), **React 19**, **Tailwind CSS 4** e **Drizzle ORM**, com banco **SQLite**: arquivo local no desenvolvimento e **Cloudflare D1** em produção.

## Funcionalidades

### Área do professor

- **Painel:** alunos ativos, chamadas do dia, valor recebido no mês, gráfico dos últimos 6 meses, aulas de hoje e últimos recibos.
- **Alunos:**
  - cadastro com contato, responsável, curso/matéria, nível, dia e horário, mensalidade e observações;
  - **usuário de acesso** do aluno, sugerido a partir do nome (ex.: `joao.araujo`) e editável;
  - busca e filtro por situação;
  - página do aluno com histórico de aulas, recibos, materiais e frequência;
  - **diário de aulas:** em cada aula, registre o conteúdo passado e o que estudar em casa. Cada registro pode aparecer para o aluno (em "Minhas aulas") ou ficar como anotação só sua;
  - **mensagem para o aluno:** um recado que aparece em destaque quando ele entra (e chega como notificação quando muda).
- **Chamada:**
  - por data, já mostrando quem tem aula naquele dia da semana;
  - situações Presente, Falta, Falta justificada e Reposição, com anotação da aula;
  - botão "todos presentes";
  - histórico com filtros, atalhos (este mês, mês passado, este ano) e totais;
  - **exportação para Excel (.xlsx)** do período, com três abas:
    - **Chamada:** grade de alunos × datas com P/F/J/R coloridos, totais e frequência;
    - **Resumo:** totais e frequência por aluno;
    - **Registros:** todas as marcações, com as observações das aulas.
- **Instituições:**
  - cadastro de escolas, igrejas, projetos ou famílias que pagam por vários alunos (CNPJ/CPF, contato, valor mensal);
  - o recibo pode sair no nome da instituição (sem listar os alunos);
  - a chamada continua por aluno: filtro por instituição na chamada e no histórico, frequência de cada aluno na página da instituição e planilha só dos alunos dela.
- **Recibos:**
  - texto no modelo: *"Eu, Nome, CPF: ..., RG: ..., residente na Rua ... - Cidade/UF, recebi da Igreja X a quantia de R$ 800,00 (oitocentos reais) referente às aulas de violino."*, com local, data e **assinatura**;
  - o "referente a" vem do cadastro do aluno ou da instituição (campo *Descrição do pagamento*) e pode ser editado na hora;
  - no cadastro da instituição dá para escolher "da", "do" ou "de" (recebi **da** Igreja, **do** Colégio...);
  - numeração automática;
  - **ver** o recibo numa janela direto da lista, **editar** (o número continua o mesmo) e **excluir**;
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
- **Avisos:** mande um aviso para todos os alunos, para os de uma instituição ou para alunos escolhidos. Ele aparece na área do aluno e chega como **notificação** no celular de quem ativou. Material novo também gera notificação.
- **Configurações:** dados que saem no recibo (CPF, RG, endereço, cidade) e a **assinatura**, desenhada na tela (dedo ou mouse) ou enviada como imagem. Com ela, o recibo já sai assinado.
- **Avisos e confirmações** do site aparecem em janelas e mensagens próprias, sem os alertas padrão do navegador.

### Vários professores (venda para outros professores)

O mesmo site atende vários professores, cada um com os próprios alunos, chamadas, recibos (numeração própria) e materiais. Um professor nunca enxerga os dados de outro.

- **Master:** a primeira conta criada (no `/configurar`) é a do administrador do site. Só ela vê o menu **Administração**.
- **Administração:**
  - criar a conta de cada professor cliente (nome, e-mail e data de validade). O site gera uma **senha provisória** e mostra os dados de acesso com botões para copiar ou enviar por WhatsApp; no primeiro login o professor é obrigado a criar a própria senha;
  - **gerar nova senha** provisória para quem esqueceu a dele;
  - bloquear ou liberar contas;
  - renovar a data de acesso;
  - excluir a conta (apaga todos os dados daquele professor).
- **Aviso de vencimento:** todo dia às 8h17 (Brasília) o site confere os acessos e manda uma notificação **só para o master** quando o acesso de um professor vence em até 2 dias, para dar tempo de cobrar e renovar. Ative as notificações no topo da tela **Administração** (precisa do `VAPID_PRIVATE_KEY`). A tabela também mostra "vence em X dias" na última semana.
- **Conta bloqueada ou vencida:** o professor e os alunos dele não conseguem entrar, mas nada é apagado. Ao liberar ou renovar, tudo volta como estava.
- O e-mail do professor é o login dele e o usuário do aluno é o login do aluno; os dois são únicos no site inteiro.

### Acesso aluno

O aluno entra em **`/aluno`** (ou na aba *Acesso aluno* do login) **só com o usuário** criado pelo professor, sem senha. Na página de cada aluno, o cartão **Acesso do aluno** tem o link pessoal dele (`/aluno?u=usuario`, que já abre com o usuário preenchido) e botões para copiar o link, copiar uma mensagem pronta ou enviar pelo WhatsApp. O aluno vê:

- os materiais liberados para ele, para ver no site, baixar ou abrir no Drive, inclusive vários de uma vez em ZIP ou PDF único;
- a mensagem do professor para ele, em destaque;
- "Minhas aulas": o diário com o conteúdo de cada aula e o que estudar em casa;
- os avisos do professor;
- o botão para **ativar as notificações** no celular.

Como não há senha, a área do aluno não mostra recibos nem dados financeiros. Para tirar o acesso de um aluno, apague o usuário dele ou marque-o como inativo.

### App no celular (PWA) e notificações

O site pode ser instalado na tela de início do celular, como um app:

- **Android (Chrome):** menu ⋮ → *Instalar app* (ou *Adicionar à tela inicial*);
- **iPhone (Safari):** botão *Compartilhar* → *Adicionar à Tela de Início*. No iPhone as notificações só funcionam com o app instalado (iOS 16.4 ou mais novo).

**Atualizações:** quando uma versão nova é publicada, quem está com o site ou o app aberto vê o aviso "Nova versão disponível" com o botão **Atualizar** (o site confere ao abrir, ao voltar para o app e a cada 15 minutos). Assim ninguém fica preso numa versão antiga em cache.

As notificações precisam de uma chave (VAPID), gerada uma vez:

```bash
npm run vapid        # imprime a chave; guarde em segredo
npx wrangler secret put VAPID_PRIVATE_KEY   # cole a linha {"kty":"EC",...}
```

Opcional: `VAPID_CONTATO` com `mailto:seu@email.com` (os serviços de push usam para contato). Sem a chave, o site funciona normalmente, só sem notificações.

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
- os alunos entram em `/aluno` com os usuários `ana.souza`, `bruno.lima` etc.

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

# o banco D1 "professor-db" já existe e o id dele está no wrangler.jsonc

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
- as tabelas precisam existir. Rode `npm run cf:migrar` uma vez no seu computador (e de novo sempre que houver migração nova em `drizzle/`), ou cole o conteúdo de [`docs/d1-criar-tabelas.sql`](docs/d1-criar-tabelas.sql) no console do D1 no painel;
- o `SESSION_SECRET` precisa estar cadastrado (pelo `wrangler secret put` ou no painel, em *Settings → Variables and Secrets*, como tipo **Secret**);
- para as notificações, cadastre também o `VAPID_PRIVATE_KEY` do mesmo jeito (veja *App no celular*).

**Quando o banco mudar** (nova migração em `drizzle/`), rode `npm run cf:migrar` antes do `npm run deploy`. Também dá para deixar automático, usando como Deploy command no Workers Builds: `npx wrangler d1 migrations apply professor-db --remote && npx wrangler deploy`.

Para aplicar uma migração pelo console do D1, sem terminal: cole o conteúdo do arquivo `drizzle/000X_nome.sql` e, em seguida, registre a migração com `INSERT INTO d1_migrations (name) VALUES ('000X_nome.sql');`.

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
| `VAPID_PRIVATE_KEY` | chave das notificações (gerada com `npm run vapid`) |
| `VAPID_CONTATO` | contato para os serviços de push (ex.: `mailto:voce@email.com`) |
| `NEXT_PUBLIC_NOME_APP` | nome do site (padrão: "Portal de Aulas") |
| `ENDERECO_SITE` | endereço oficial usado nos links enviados aos alunos e professores (ex.: `https://professor.mmoraes.com.br`; fica no `wrangler.jsonc`) |
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
