# Plano de Refatoração do Painel de Resumo por Categoria

Refatorar o componente `ResumoCategorias` para um design mais sofisticado, profissional e intuitivo, seguindo o padrão visual do Investidor 10 e garantindo responsividade total.

## Alterações Propostas

### 1. Refinamento de Design (Glassmorphism & Tipografia)

- **Componente `DashboardCard`**: Ajustar padding e bordas para maior elegância.
- **Tipografia**: Utilizar variáveis de tipografia semântica (`text-label`, `text-metric`) para consistência.
- **Efeitos Visuais**: Refinar o brilho dinâmico e o gradiente radial no hover para uma sensação mais "premium".

### 2. Layout & Responsividade

- **Grid Adaptativo**: Ajustar o grid para exibir cards menores em mobile e mais densos em desktop.
- **Alinhamento**: Centralizar textos e números nos cards de categoria.
- **Densidade**: Reduzir o espaçamento entre o rótulo da categoria e os valores numéricos.

### 3. Integração de Dados & Indicadores

- **Indicadores Visuais**: Padronizar ícones de variação (`TrendingUp`/`TrendingDown`) e cores semânticas (`success`/`destructive`).
- **Resumo por Categoria**: Garantir que as informações de lucro (R$) e variação (%) estejam sempre visíveis e bem formatadas.

## Detalhes Técnicos

- Atualização do arquivo `src/components/dashboard/resumo-categorias.tsx`.
- Ajustes em `src/components/dashboard/dashboard-card.tsx` para consistência.
- Uso de `oklch` para todas as cores, respeitando o tema escuro/claro.

---

Este plano visa entregar uma interface profissional e intuitiva, removendo ruídos visuais e focando na legibilidade dos dados financeiros.
