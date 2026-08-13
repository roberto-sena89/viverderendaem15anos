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
- **Proventos** — dividendos mensais/anuais, *yield on cost*, calendário e histórico.
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
- **Técnico IA** — assistente financeiro integrado que responde perguntas como
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

| Fonte | Uso |
| --- | --- |
| [Yahoo Finance](https://finance.yahoo.com) | Cotações e histórico de ações, FIIs, ETFs e índices |
| [brapi.dev](https://brapi.dev) | Cotações, módulos de perfil/financeiro e rankings da B3 |
| [Fundamentus](https://www.fundamentus.com.br) | Indicadores fundamentalistas, DRE e resultados de FIIs |
| [Banco Central do Brasil](https://www.bcb.gov.br) | SGS (Selic, CDI, IPCA, dólar) e Expectativas Focus |
| Google News RSS | Agregador de notícias financeiras |

Todas as consultas contam com cache em memória, *retry* e *rate limiting* amigável
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

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo desenvolvimento |
| `npm run preview` | Pré-visualização do build |
| `npm run lint` | Verificação de lint (ESLint) |
| `npm run format` | Formatação com Prettier |
| `npm test` | Testes com Vitest |

### Variáveis de ambiente

Crie um arquivo `.env` na raiz com as credenciais do seu projeto Supabase:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Opcional:
- `BRAPI_TOKEN` — token do brapi.dev para ampliar os limites de cotações.
- Variáveis `USER_LLM_*` — credenciais do provedor de IA para o assistente.

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
