---
name: radar-cotacoes
description: Use when working on the Radar de Oportunidades or cotações in viverderendaem15anos-lovable — editing src/lib/radar*.ts, use-market-quote.ts, brapi-quote.server.ts, components/radar/* or routes/_authenticated/radar.tsx. Covers domain data flow, file map, TanStack Query/SSR conventions, and the validation+commit flow (tsc, eslint, prettier, vitest, pt-BR conventional commits).
---

# Radar / Cotações

Fluxo de desenvolvimento do Radar de Oportunidades e cotações no projeto
viverderendaem15anos-lovable (TanStack Start + TanStack Query + SQLite
Better-SQLite3).

## Fluxo de dados (domínio)

1. **Cotações**: `brapi-quote.server.ts` busca preço/variação do dia na Brapi →
   `use-market-quote.ts` entrega o hook de mercado no cliente.
2. **Histórico**: `market.server.ts` (`buscarHistorico`) alimenta as grades;
   `radar.server.ts` agrega as séries de cada ativo → `PosicaoHistorica`
   (mínimo/máximo da série, mín/máx de 52 semanas, drawdown máximo,
   volatilidade anual, percentil).
3. **Sinais**: `radar-base.ts` (`sinalRadar`) combina `percentil`, `variacaoDia`,
   `dy12`, `pvp` e notícias de impacto → comprar (mínimas históricas),
   vender (choque/deterioração) ou manter (zona neutra).
4. **Score**: `scoreOportunidade` (0–100) pondera preço (0.5), DY (0.3) e
   risco (0.2), com desconto por notícia de alto impacto.
5. **Cache/persistência**: em `cotacoes_cache` (SQLite) chaves `radar:posicao`,
   `radar:serie:<TICKER>` e `radar:ia:<TICKER>`; em memória com TTL.

## Mapa de arquivos

| Arquivo                                                 | Papel                                                                                                                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/radar-base.ts`                                 | Lógica pura de sinais e score (sem I/O). Exporta constantes de limites (`LIMITE_MINIMA`, `CHOQUE_DIA_PCT`, etc.). Testável via `radar-base.test.ts`.                                                |
| `src/lib/radar-base.test.ts`                            | Testes vitest da lógica pura.                                                                                                                                                                       |
| `src/lib/radar.server.ts`                               | Server functions + banco. `lerPosicoesBanco()` deve usar o cache em memória (`TTL_BANCO_POSICOES_MS` 10min + dedup de leituras concorrentes); `gravarPosicoesBanco()` atualiza o cache após upsert. |
| `src/lib/radar.functions.ts`                            | Definições de `createServerFn` do radar (`radarVisao`, `radarPosicoes`, `radarAnaliseIA`, ...).                                                                                                     |
| `src/lib/radar.ts`                                      | Hooks de cliente (TanStack Query) + re-export de tipos.                                                                                                                                             |
| `src/lib/brapi-quote.server.ts` / `use-market-quote.ts` | Cotações externas (Brapi) e hook de mercado.                                                                                                                                                        |
| `src/components/radar/*`                                | UI (tabela, ranking, modal).                                                                                                                                                                        |
| `src/routes/_authenticated/radar.tsx`                   | Rota do radar, com `loader` para pré-busca SSR.                                                                                                                                                     |

## Convenções de dados

- `useRadarVisao(categoria)` usa `queryKey: ["radar","visao",categoria]` e
  `staleTime: 3min`. O `loader` da rota /radar deve chamar `ensureQueryData`
  com a mesma queryKey para preencher o cache antes do hidratar.
- Por padrão: `refetchOnWindowFocus: false`, `staleTime`/`gcTime` generosos
  (posições 12h/24h, IA 72h).
- Backfill automático de históricos é proporcional ao universo da categoria
  (4–10 rodadas de 120, baseado em `visao.contagem.total`); manual usa 12
  (`preencherHistoricos(manual: boolean)`). O `loader` da rota aquece a visão
  de FIIs em segundo plano (fire-and-forget) além da de Ações.

## Validação obrigatória antes de concluir

1. `npx tsc --noEmit` — zero erros de tipo.
2. `npx prettier --write <arquivos alterados>` — formatação do repo.
3. `npx prettier --check <arquivos alterados>` — confirmar formatação antes de concluir.
4. `npm run lint` — `eslint .` no repo inteiro, zero violações.
5. `npx vitest run src/lib/radar-base.test.ts` — testes do radar verdes.

## Commits

- Mensagens em pt-BR, conventional commits: `feat(radar): ...`,
  `fix(radar): ...`, `perf(radar): ...`, `test(radar): ...`.
- Nunca reescrever histórico publicado (projeto conectado ao Lovable):
  sem force push, rebase, amend ou squash de commits já enviados.
- Commit+push apenas quando o usuário autorizar explicitamente.
