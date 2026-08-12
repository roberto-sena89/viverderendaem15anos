# Plano de Ações Rápidas em Alertas e Destaque no Overlay

O objetivo é integrar o sistema de alertas com o painel de categorias, permitindo que, ao clicar em um alerta no sino ou ver um alerta no painel, o usuário possa abrir rapidamente os detalhes da categoria correspondente e visualizar quais ativos dispararam aquele alerta.

## Alterações Propostas

### 1. Sistema de Alertas (`src/lib/alertas-historico.ts`)
- Adicionar o campo opcional `categoria` à interface `AlertaDisparado` para facilitar a navegação.
- Atualizar a função `registrarAlerta` para buscar a categoria do ativo antes de salvar.

### 2. Provedor de Cotações (`src/lib/cotacoes-tempo-real.tsx`)
- Modificar a lógica de disparo de alertas para incluir o nome da categoria do ativo no registro do alerta.

### 3. Sino de Alertas (`src/components/sino-alertas.tsx`)
- Adicionar uma ação de clique em cada alerta da lista.
- Quando o usuário clicar em um alerta de variação, fechar o popover do sino e abrir o overlay de detalhes da categoria correspondente no Dashboard.
- Utilizar um evento customizado ou um estado global simples (via query string ou contexto) para disparar a abertura do overlay a partir do sino.

### 4. Resumo por Categorias (`src/components/dashboard/resumo-categorias.tsx`)
- Adicionar suporte para abrir o overlay via sinal externo (ex: URL param ou evento).
- Implementar a lógica para "destacar" ativos que causaram oscilação.

### 5. Overlay de Detalhes da Categoria (`src/components/dashboard/overlay-detalhes-categoria.tsx`)
- Receber uma lista de tickers para "destaque".
- Adicionar um efeito visual (borda pulsante ou cor de fundo sutil) nos ativos da lista de composição que coincidam com os tickers que geraram alertas recentes.
- Incluir um botão ou link "Ver detalhes" nos cards de alerta dentro do dashboard.

## Detalhes Técnicos
- **Comunicação entre componentes**: Usaremos um pequeno ajuste no `useAtivosAoVivo` ou um novo evento customizado `app:abrir-categoria` para que o `SinoAlertas` (no header) possa se comunicar com o `ResumoCategorias` (no dashboard).
- **UX**: O destaque visual nos ativos será baseado nos alertas das últimas 24h para aquela categoria.

## Verificação
1. Simular uma variação de preço para disparar um alerta.
2. Abrir o sino e clicar no alerta.
3. Verificar se o overlay da categoria correta abre.
4. Verificar se o ativo que disparou o alerta está visualmente destacado na lista de composição.
