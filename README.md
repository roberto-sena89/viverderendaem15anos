# Viver de Renda em 15 Anos

Plataforma web premium para investidores brasileiros que querem construir patrimônio,
controlar a carteira e alcançar a independência financeira — com planejamento, dados
de mercado em tempo real e um assistente de inteligência artificial.

Aplicação ao vivo: https://viverderendaem15anos.lovable.app

---

## Sobre o projeto

O **Viver de Renda em 15 Anos** centraliza o controle dos seus investimentos em um
único lugar: cotações da B3 em tempo real, proventos, aportes, metas e projeções de
independência financeira, com a experiência de um SaaS premium (design moderno,
dark/light mode, responsivo e acessível).

O nome reflete a proposta central: descobrir **em quantos anos você pode viver de
renda** a partir do seu patrimônio, aportes e estratégia — e traçar o caminho para
chegar lá.

## Funcionalidades

### Carteira e patrimônio

- **Resumo** — patrimônio, valor investido, rentabilidade, dividend yield, meta
  financeira e tempo estimado para a independência, com gráficos de evolução.
- **Carteira** — tabela completa por ativo (ticker, quantidade, preço médio, preço
  atual, lucro, rentabilidade, DY, participação) com filtros por categoria
  (ações, FIIs, ETFs, Tesouro, renda fixa).
- **Proventos** — dividendos mensais/anuais, _yield on cost_, calendário e histórico.
- **Aportes** — cadastro de aportes (data, corretora, ativo, categoria, quantidade,
  preço, taxas e observações) e **histórico de aportes**.
- **Importar B3** — importação de notas de corretagem e exportação em Excel/PDF,
  incluindo relatório de auditoria em PDF.
- **Rebalanceamento** — alocação atual vs. ideal, diferença e semáforo do valor a
  ajustar, com alocação-alvo personalizável.

### Mercado e oportunidades

- **Cotações** — painel ao vivo de ações, FIIs, ETFs, Tesouro, criptomoedas, índices
  e commodities, com comparadores, histórico e modal de detalhe por ativo.
- **Ranking de Ativos** — rankings da B3 por dividend yield, valor de mercado e
  outros indicadores, combinando brapi.dev e Fundamentus.
- **Notícias de Mercado** — agregador de notícias financeiras a partir de feeds RSS.
- **Radar de Oportunidades** — varredura de ativos com base em fundamentos para
  identificar oportunidades.

### Planejamento e inteligência

- **Planejador Financeiro** — simule a aposentadoria informando idade, patrimônio,
  aportes, aumento anual, rentabilidade, inflação e taxa de retirada; o sistema
  projeta o patrimônio ano a ano, a renda passiva e a data estimada da independência,
  com cenários otimista, base e conservador.
- **Metas** — sistema de metas (reserva de emergência, 100 mil, 1 milhão...) com
  barras de progresso.
- **Gestor IA** — assistente financeiro integrado que responde perguntas como
  "quanto devo aportar este mês?", "minha carteira está desbalanceada?" e
  "quanto falta para me aposentar?".
- **Tributação e análise de risco** — painéis de apuração de impostos e análise de
  risco da carteira.

### Conteúdo público

- Blog e páginas educativas (guia de liberdade financeira, calculadora de juros
  compostos, o que é renda passiva, quanto rende 1 milhão por mês) com integração
  de newsletter.

## Fontes de dados

Os dados de mercado são obtidos de fontes públicas gratuitas:

| Fonte                                             | Uso                                                     |
| ------------------------------------------------- | ------------------------------------------------------- |
| [Yahoo Finance](https://finance.yahoo.com)        | Cotações e histórico de ações, FIIs, ETFs e índices     |
| [brapi.dev](https://brapi.dev)                    | Cotações, módulos de perfil/financeiro e rankings da B3 |
| [Fundamentus](https://www.fundamentus.com.br)     | Indicadores fundamentalistas, DRE e resultados de FIIs  |
| [Banco Central do Brasil](https://www.bcb.gov.br) | SGS (Selic, CDI, IPCA, dólar) e Expectativas Focus      |
| Google News RSS                                   | Agregador de notícias financeiras                       |

Todas as consultas contam com cache em memória, _retry_ e _rate limiting_ amigável
às fontes públicas.

## Tecnologias

- **React 19** + **TypeScript** (modo estrito)
- **TanStack Start** / **TanStack Router** (SSR, server functions)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI) + **Lucide** icons
- **Supabase** (autenticação, banco PostgreSQL e MCP)
- **TanStack Query** — cache e sincronização de dados
- **Recharts** — gráficos profissionais
- **React Hook Form** + **Zod** — formulários e validação
- **AI SDK** (Vercel) — assistente financeiro
- **Vite** + **Vitest** — build e testes
- **jsPDF / SheetJS / write-excel-file** — exportação PDF/Excel

## Estrutura do projeto

```
src/
├── components/          # UI reutilizável (cards, tabelas, modais, gráficos)
│   ├── ui/              # primitivas shadcn/ui
│   ├── acoes|fiis|etfs|tesouro|cripto|indices|commodities/
│   ├── noticias/        # agregador de notícias
│   └── radar/           # radar de oportunidades
├── integrations/
│   ├── supabase/        # cliente, autenticação e middlewares
│   └── lovable/         # integração com a plataforma Lovable
├── lib/                 # lógica de negócio e fontes de dados (server)
├── routes/              # rotas TanStack Router (páginas autenticadas e públicas)
└── types/               # tipos gerados do router
```

## Desenvolvimento

Pré-requisitos: **Node.js** (instale com [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)) e **npm**.

```sh
# 1. instale as dependências
npm i

# 2. rode em modo de desenvolvimento
npm run dev
```

### Scripts

| Comando             | Descrição                          |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Ambiente de desenvolvimento (Vite) |
| `npm run build`     | Build de produção                  |
| `npm run build:dev` | Build em modo desenvolvimento      |
| `npm run preview`   | Pré-visualização do build          |
| `npm run lint`      | Verificação de lint (ESLint)       |
| `npm run format`    | Formatação com Prettier            |
| `npm test`          | Testes com Vitest                  |

### Variáveis de ambiente

Crie um arquivo `.env` na raiz com as credenciais do seu projeto Supabase:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Opcional:

- `BRAPI_TOKEN` — token do brapi.dev para ampliar os limites de cotações.
- `VITE_SENTRY_DSN` — DSN do [Sentry](https://sentry.io) para monitoramento de erros
  do navegador (erros de produção com contexto de rota; sem DSN nada é enviado).

## Nível 2 — Funcionalidades de valor

### 📅 Calendário de Proventos Futuros (12 meses)
Projeção dos próximos dividendos da carteira: média dos proventos dos últimos 12 meses
por ativo × posição atual. Gráfico mês a mês e tabela por ativo, com aviso para
posições sem histórico. Exibido em **Proventos** (`src/lib/proventos-futuros.ts`,
`src/components/calendario-proventos.tsx`).

### 🧾 Prejuízo Fiscal & Tax-Loss Harvesting
Apura prejuízos acumulados por categoria (Ações, FIIs, ETFs, BDRs, Stocks, Cripto)
seguindo as regras da Receita (compensação na mesma regra, isenção por volume) e
sugere ativos abaixo do preço médio com o potencial de perda realizável. Exibido em
**Carteira** (`src/lib/prejuizo-fiscal.ts`, `src/components/painel-prejuizo-fiscal.tsx`).
Vendas são registradas como aportes com quantidade negativa (padrão já usado por
`tributacao.ts`).

### 🔔 Alertas de Preço (server-side + push)
Crie alertas "PETR4 acima de R$ 35,00" na página **Cotações**. A tabela
`alertas_preco` (migration `20260823010000_alertas_preco_carteiras_publicas.sql`) guarda
os alvos com RLS; o hook `/api/public/hooks/verificar-alertas-preco` (protegido por
`CRON_SECRET`) verifica os preços e dispara Web Push ao atingir o alvo.

O agendamento usa **GitHub Actions** (`.github/workflows/verificar-alertas.yml`,
a cada 15 min), o mesmo padrão dos demais hooks do projeto — não depende de pg_cron.

> **Importante:** para qualquer hook agendado funcionar, o secret `CRON_SECRET`
> precisa existir **nos dois lugares** com o mesmo valor:
> 1. Env var `CRON_SECRET` no Lovable Cloud (é o que o hook compara);
> 2. GitHub Secret `CRON_SECRET` (é o que o workflow envia no header
>    `x-cron-secret`). Configure em Settings → Secrets and variables → Actions
>    do repositório, ou via `gh secret set CRON_SECRET`.

### 🎛️ Simulador "E se?" (What-If)
10 cenários de quebra-hipótese sobre o plano atual (aporte dobrado/metade, parar
aportes, rentabilidade ±3%, inflação +2%, aposentar ±5 anos, retirada 3%/5%).
Cada um mostra o impacto na data da independência e um gráfico comparado ao plano
atual. Exibido em **Planejador** (`src/lib/what-if.ts`, `src/components/simulador-what-if.tsx`).

### 📈 Comparador de Estratégias
Projeta o mesmo plano com 5 alocações (Conservador 8%, Moderado 10%, Agressivo 13%,
Foco em Dividendos 9%, Selic Alta 15%) e rankeia quem chega primeiro à independência.
Exibido em **Planejador** (`src/lib/comparador-estrategias.ts`,
`src/components/comparador-estrategias.tsx`).

## Nível 3 — A joia imaginativa

### 🕰️ Relógio da Liberdade
Não é um gráfico — é um **objeto emocional** no topo do **Dashboard**: um mostrador
analógico (anel de progresso + ponteiro) que gira conforme sua renda passiva cobre
a meta de renda mensal. Cada dividendo "compra dias de liberdade".

- **Mostrador analógico SVG** com marcas de hora, anel de progresso e ponteiro que
  avança suavemente (transição de 1s) conforme os dados mudam.
- **Cor emocional por estágio**: vermelho (Despertar) → laranja (Impulso) → verde
  (Acumulação) → dourado (Liberdade), com mensagens motivacionais.
- **Leituras digitais**: % da meta coberta, renda passiva mensal estimada (DY da
  carteira), e quantos dias de liberdade o mês já está comprado.
- **Interação "E se eu parar de aportar?"**: o ponteiro re-projeta sem aportes e
  mostra em quanto tempo a liberdade chegaria apenas com o patrimônio atual.
- **Mini-histórico**: últimos 12 meses de proventos convertidos em dias de liberdade
  comprados, com destaque para o melhor mês.
- **Meta de renda mensal editável** (persistida em localStorage; padrão R$ 25 mil).

Código: `src/lib/relogio-liberdade.ts` (lógica pura, 6 testes unitários) e
`src/components/relogio-liberdade.tsx` (mostrador + painel).

### 📤 Carteira Pública Compartilhável
Gere um link público único (expirável 7/30/90 dias ou nunca) com snapshot da carteira
(opcionalmente **sem** valores em reais). A rota pública `/compartilhada/[token]`
renderiza o resumo sem login (lê via `supabaseAdmin` para contornar RLS). Tabela
`carteiras_compartilhadas` na migration `20260823010000_alertas_preco_carteiras_publicas.sql`.
Exibido em **Carteira** (`src/lib/carteira-publica.ts`,
`src/components/carteira-publica-compartilhar.tsx`).

### 📧 Relatório Semanal do Investidor
Resumo gerado dos dados reais: patrimônio com variação vs. semana anterior (salva em
localStorage), aportes, proventos da semana, renda mensal estimada e progresso das
metas. Botão "copiar resumo" para compartilhar. Exibido em **Dashboard**
(`src/lib/relatorio-semanal.ts`, `src/components/relatorio-semanal.tsx`).

### 🎯 Score do Investidor + Gamificação
Nota 0-100 com 5 pilares transparentes (disciplina de aportes 30%, diversificação 25%,
metas 20%, renda passiva 15%, horizonte 10%) e 5 níveis (Iniciante → Lenda do Milhão)
com conquistas automáticas. Exibido em **Dashboard**
(`src/lib/score-investidor.ts`, `src/components/score-investidor.tsx`).

### PWA (Progressive Web App)

O app é instalável: em produção o Service Worker (`public/sw.js`) é registrado
automaticamente e o manifesto (`public/manifest.webmanifest`) oferece instalação
"adicionar à tela inicial", abrir offline (parcial), atalhos para Dashboard,
Carteira e Planejador. Em desenvolvimento o SW não é registrado para não
atrapalhar o HMR.

### Web Push (notificações com o app fechado)

Alertas de preço, radar e resumo podem chegar como notificação nativa mesmo com
o app fechado. Requer chaves VAPID:

```sh
npm run gerar:vapid
```

Isso gera e salva as chaves em `.env`/`.env.local`:

| Variável               | Onde          | Descrição                          |
| ---------------------- | ------------- | ---------------------------------- |
| `VITE_VAPID_PUBLIC_KEY`| `.env`        | Chave pública (vai ao navegador)   |
| `VAPID_PUBLIC_KEY`     | `.env.local`  | Chave pública (servidor)           |
| `VAPID_PRIVATE_KEY`    | `.env.local`  | Chave privada (NUNCA publicar)     |
| `VAPID_SUBJECT`        | `.env.local`  | mailto: ou URL de contato          |

A migration `supabase/migrations/20260823000000_push_subscriptions.sql` (tabela
`push_subscriptions` com RLS) é aplicada automaticamente pelo Lovable no deploy —
o mesmo vale para `20260823010000_alertas_preco_carteiras_publicas.sql`. O envio é
feito pelo hook `/api/public/hooks/notificar-push` (protegido por `CRON_SECRET`),
agendável via GitHub Actions (`.github/workflows/verificar-alertas.yml` segue o
mesmo padrão dos demais hooks).

### CI/CD (GitHub Actions)

O workflow `.github/workflows/qualidade.yml` roda em todo push/PR:

1. **Lint + Build** — `npm run lint` e `npm run build` (heap ampliado para o SSR).
2. **E2E (Chromium)** — `npx playwright test --project=chromium` com relatório
   publicado como artefato em caso de falha.

> 💡 **Lint local no Windows:** o repo usa `endOfLine: "lf"` e o git converte
> CRLF→LF no commit, então o lint passa no CI. Localmente, se o `npm run lint`
> acusar centenas de `Delete ␍`, são line endings do checkout Windows — rode
> `git config core.autocrlf false` e faça checkout limpo, ou ignore-os (só o CI
> é autoritativo).

### Provedores de IA (Gestor IA)

As chaves dos provedores de IA são lidas no **servidor** via variáveis de ambiente —
configure-as uma única vez e elas nunca vão para o navegador nem para o repositório:

- **Produção (Lovable):** Settings do projeto → Environment variables / Secrets.
- **Desenvolvimento local:** `.env.local` (na raiz, gitignored) — já existe um modelo
  com todos os placeholders.

| Variável               | Provedor     | Onde gerar a chave                  | Modelo gratuito padrão                |
| ---------------------- | ------------ | ----------------------------------- | ------------------------------------- |
| `TOKEN_ROUTER_API_KEY` | Token Router | tokenrouter.com/dashboard           | `deepseek/deepseek-v4-pro-0813-free`  |
| `ORCAROUTER_API_KEY`   | OrcaRouter   | orcarouter.ai                       | `qwen/qwen3.8-27b-free`               |
| `OPENROUTER_API_KEY`   | OpenRouter   | openrouter.ai/keys                  | `nvidia/nemotron-3-ultra-550b-a55b:free` |
| `NVIDIA_API_KEY`       | NVIDIA NIM   | build.nvidia.com/settings/api-keys  | `z-ai/glm-5.2`                        |
| `OPENCODE_API_KEY`     | OpenCode Zen | opencode.ai/auth                    | `deepseek-v4-flash-free`              |
| `CLINE_API_KEY`        | Cline        | app.cline.bot → Settings → API Keys | `minimax/minimax-m3`                  |

Override opcional de URL base por provedor: `<PREFIXO>_BASE_URL`
(ex.: `TOKEN_ROUTER_BASE_URL`, `OPENROUTER_BASE_URL`).

**Precedência:** 1. configuração salva no navegador (localStorage, via diálogo do
Gestor IA); 2. primeira chave de ambiente existente, na ordem da tabela; 3. IA nativa
da plataforma (Lovable AI Gateway).

### Observador de Mercado (Radar)

O **Observador de Mercado** é o "relógio do mercado" do Radar: a cada 10–30 minutos
ele varre o universo completo (Ações + FIIs), submete os melhores candidatos à IA do
seu provedor **gratuito** (as mesmas variáveis da tabela acima — nunca usa o gateway
pago) e publica um briefing executivo na página Radar, destacando as oportunidades
novas desde a última varredura.

Como funciona:

- **Candidatos:** as ~12 melhores linhas por score de oportunidade do Radar (mesma
  metodologia da página, usando percentil da posição, DY, drawdown e notícias de
  impacto), junto do contexto macro (Selic/IPCA) e das notícias urgentes.
- **Briefing:** resumo do estado do mercado, oportunidades com veredito
  (`comprar`/`manter`/`observar`/`vender`), convicção, motivo e gatilho, além de
  alertas de risco. O observador segue uma disciplina de mesa proprietária: cita
  números, não inventa preço-alvo e trata manchete como ruído até confirmada.
- **Proteções:** intervalo mínimo de 10 minutos entre varreduras e deduplicação de
  execuções concorrentes — o provedor gratuito nunca é bombardeado.
- **Persistência:** a última e a penúltima varredura ficam em `cotacoes_cache`
  (chave `observador:mercado`), permitindo marcar "NOVO" no que mudou.

**Agendamento automático:** o GitHub Actions (`.github/workflows/observador.yml`)
chama o hook a cada 20 minutos — nenhuma configuração no Supabase é necessária.
O workflow envia o header `x-cron-secret` com o valor do GitHub Secret
`CRON_SECRET` (que deve ser igual à env `CRON_SECRET` do Lovable Cloud).

Sem agendamento, o botão **"Observar agora"** na página Radar executa a varredura
manualmente (limitado a 5 execuções por usuário a cada 10 minutos).

## Testes

O projeto usa **Vitest** + Testing Library. Os testes cobrem a lógica de negócio
(portfólio, tributação, análise de carteira, radar e componentes de UI):

```sh
npm test
```

## Integração com Lovable

Este projeto é conectado ao [Lovable](https://lovable.dev). Alterações feitas no
[editor](https://lovable.dev/projects/2d2a8cb8-9920-4474-93cb-9648b17a1ab9) são
commitadas diretamente neste repositório, e pushes em `main` sincronizam de volta
para o Lovable. Evite reescrever o histórico publicado (force push, rebase ou
squash de commits já enviados).
