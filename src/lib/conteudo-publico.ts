/**
 * Registro de conteúdo público indexável.
 *
 * Cada entrada vira uma página servida por SSR em `/conteudo/<slug>` com
 * dados estruturados (Article + FAQPage + BreadcrumbList), entrando sozinha
 * no sitemap. Para publicar uma página nova basta adicionar um item aqui —
 * sem tocar em rotas nem no sitemap.
 */

export interface SecaoConteudo {
  titulo: string;
  paragrafos: string[];
  lista?: { titulo: string; corpo: string }[];
}

export interface ConteudoPublico {
  slug: string;
  categoria: string;
  /** <title> — ideal até ~60 caracteres. */
  titulo: string;
  /** meta description — ideal até ~155 caracteres. */
  descricao: string;
  /** H1 da página. */
  h1: string;
  intro: string;
  secoes: SecaoConteudo[];
  faq: { q: string; a: string }[];
  /** Data de revisão (AAAA-MM-DD): alimenta `lastmod` do sitemap. */
  atualizadoEm: string;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const CONTEUDOS: ConteudoPublico[] = [
  {
    slug: "quanto-rende-1-milhao-renda-fixa",
    categoria: "Renda fixa",
    titulo: "Quanto rende 1 milhão na renda fixa por mês?",
    descricao:
      "Quanto rende 1 milhão de reais aplicado em CDB, Tesouro Selic, Tesouro IPCA e LCI/LCA por mês — com exemplos e opções de rendimento.",
    h1: "Quanto rende 1 milhão de reais na renda fixa?",
    intro: `Com ${brl(1_000_000)} aplicados em renda fixa, o rendimento mensal depende da taxa do título, do prazo e da tributação. Em períodos de juros altos, a renda passiva de uma carteira de renda fixa pode chegar a valores relevantes por mês — e, em cenários de juros baixos, cai pela metade ou mais. Este guia mostra as faixas típicas em cada tipo de título.`,
    secoes: [
      {
        titulo: "A regra prática: o rendimento segue a Selic",
        paragrafos: [
          `No Brasil, o CDI costuma girar próximo da taxa Selic. Em um cenário de Selic em torno de 12% ao ano, uma carteira de renda fixa atrelada ao CDI rende cerca de 12% ao ano bruto — ou seja, ${brl(1_000_000)} geram aproximadamente ${brl(120_000)} por ano, cerca de ${brl(10_000)} por mês antes do imposto.`,
          "Os números são simplificações: o rendimento mensal não é exatamente 1/12 do anual, e o imposto de renda — até 22,5% nos primeiros 6 meses, chegando a 15% após 2 anos — reduz o valor líquido.",
        ],
        lista: [
          {
            titulo: "CDI",
            corpo: "Índice de referência dos títulos bancários (CDB, LC); gira próximo da Selic.",
          },
          {
            titulo: "IR regressivo",
            corpo: "CDB, LC e Tesouro pagam 22,5% até 180 dias, caindo até 15% após 720 dias.",
          },
          {
            titulo: "Isentos",
            corpo:
              "LCI/LCA e CRI/CRA não pagam IR para pessoa física quando cumprem os prazos mínimos.",
          },
        ],
      },
      {
        titulo: "Exemplos por título",
        paragrafos: [
          `CDB 100% do CDI: acompanha a Selic; com juros a 12% a.a., rende ~${brl(10_000)} brutos por mês.`,
          `Tesouro Selic: mesmo comportamento, com liquidez diária — a escolha padrão para reserva de emergência.`,
          `Tesouro IPCA+: garante inflação + taxa prefixada (ex.: IPCA + 6% a.a.) — protege o poder de compra ao longo das décadas.`,
          "LCI/LCA isentos de IR podem entregar líquido próximo de um CDB de 110%, dependendo do banco emissor.",
        ],
      },
      {
        titulo: "E o valor líquido por mês?",
        paragrafos: [
          `Com 12% a.a., o juro mensal bruto de 1 milhão é ~${brl(10_000)}; descontados 15% de IR (títulos com mais de 2 anos), restam ~${brl(8_500)}. Já em um cenário de Selic a 9% a.a., o líquido cai para ~${brl(6_400)} mensais.`,
          "A conclusão prática: a renda fixa brasileira atual paga entre ~6 e 8 mil reais líquidos por milhão por mês, dependendo da taxa. Para uma aposentadoria sustentável, a mistura com renda variável, o reinvestimento da renda e a disciplina de aportes continuam fazendo a diferença no longo prazo.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende 1 milhão no Tesouro Selic por mês?",
        a: "Com Selic em torno de 12% a.a., 1 milhão no Tesouro Selic rende ~R$ 10.000 brutos por mês; líquido de IR no prazo longo, ~R$ 8.500 mensais. O valor acompanha a taxa básica.",
      },
      {
        q: "É melhor Tesouro Selic, CDB ou LCI para 1 milhão?",
        a: "Para liquidez diária, Tesouro Selic. Para taxa maior com prazo definido, CDBs que pagam acima de 100% do CDI. Para horizontes mínimos de 90 dias, LCI/LCA isentos de IR podem entregar rendimento líquido equivalente.",
      },
      {
        q: "1 milhão na renda fixa permite viver de renda?",
        a: "Depende do custo de vida. Pela regra de retirada segura de 4% ao ano, 1 milhão permite retirar R$ 40 mil/ano — cerca de R$ 3,3 mil/mês — com risco reduzido de exaustão da carteira em prazos longos.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-1-milhao-acoes-dividendos",
    categoria: "Ações",
    titulo: "Quanto rende 1 milhão em ações de dividendos?",
    descricao:
      "Quanto 1 milhão em ações pagadoras de dividendos rende por mês, com faixas de yield, reinvestimento e considerações de risco de preço.",
    h1: "Quanto rende 1 milhão em ações de dividendos?",
    intro: `Em ações de empresas brasileiras que pagam dividendos, 1 milhão rende, em média, algo entre 5% e 8% ao ano em proventos — cerca de R$ 4.000 a R$ 6.500 por mês. Diferente da renda fixa, o rendimento não é estável: o valor do provento e o preço das ações oscilam com o resultado das empresas.`,
    secoes: [
      {
        titulo: "O que é dividend yield na prática",
        paragrafos: [
          "Dividend yield é quanto a empresa paga de proventos em um ano dividido pelo preço atual da ação. As pagadoras históricas da B3 costumam entregar entre 4% e 8% ao ano, dependendo do setor e do momento do ciclo.",
          `Com 1 milhão: 4% a.a. → ~${brl(40_000)}/ano (${brl(3_300)}/mês); 6% a.a. → ~${brl(60_000)}/ano (${brl(5_000)}/mês); 8% a.a. → ~${brl(80_000)}/ano (${brl(6_600)}/mês).`,
          "Cuidado com yields muito altos (acima de ~12%): podem ser proventos não recorrentes ou reflexo de quedas fortes de preço — confira o histórico de pagamentos antes.",
        ],
      },
      {
        titulo: "Por que reinvestir os dividendos faz diferença",
        paragrafos: [
          "No início, o provento recebido em caixa pode ser usado para comprar mais ações. Este ciclo — juros compostos — é o motor do crescimento patrimonial: reinvestir os proventos acelera a chegada à independência financeira.",
        ],
        lista: [
          {
            titulo: "Reinvestir",
            corpo:
              "Reinvestir o provento em vez de gastar acelera a construção do patrimônio; o dividendo recebido é isento de IR para pessoa física.",
          },
          {
            titulo: "Diversificar",
            corpo:
              "Setores diferentes (bancos, energia, consumo) suavizam quedas pontuais de dividendos de um setor isolado.",
          },
          {
            titulo: "Horizonte",
            corpo:
              "Só retire os proventos quando eles superarem seu custo de vida mensal com folga.",
          },
        ],
      },
      {
        titulo: "Considerações de preço e volatilidade",
        paragrafos: [
          "Ações oscilam mais que a renda fixa: em anos ruins a carteira pode cair 20% enquanto os dividendos continuam entrando. O que sustenta o investidor é o fluxo de caixa e o horizonte de longo prazo.",
          "Reserva de suporte: manter uma parte da carteira em renda fixa líquida evita vender ações na queda para pagar contas.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende 1 milhão em ações por mês?",
        a: "Entre ~R$ 3.300 e ~R$ 6.600/mês, dependendo do dividend yield da carteira (4% a 8% ao ano). Dividendos são isentos de IR para pessoa física dentro das regras atuais.",
      },
      {
        q: "É melhor 1 milhão em ações de dividendos ou FIIs?",
        a: "Não há resposta única: FIIs pagam mensalmente e são tradicionais geradores de caixa; ações de dividendos têm historicamente maior potencial de apreciação e crescimento de proventos. Uma carteira combinada costuma ser melhor.",
      },
      {
        q: "Dividendos pagam imposto de renda?",
        a: "Dividendos distribuídos são hoje isentos para pessoa física. Já o lucro na venda das ações paga IR de 15% sobre o ganho de capital.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-aportar-para-viver-de-renda",
    categoria: "Planejamento",
    titulo: "Quanto investir por mês para viver de renda?",
    descricao:
      "Quanto aportar por mês para atingir a independência financeira: renda alvo, patrimônio necessário, tabelas de tempo e cálculo passo a passo.",
    h1: "Quanto preciso investir por mês para viver de renda?",
    intro: `O valor depende de três variáveis: o custo de vida mensal que você quer cobrir, o patrimônio alvo (custo de vida × 300, pela regra dos 4%) e a rentabilidade real da carteira — geralmente considerada entre 4% e 6% acima da inflação em prazos longos. Com esses três números, a conta do aporte mensal é imediata.`,
    secoes: [
      {
        titulo: "Passo 1 — Defina seu patrimônio alvo",
        paragrafos: [
          `Usando a regra da retirada segura: patrimônio alvo = custo de vida mensal × 300. Para R$ 5.000/mês → ${brl(1_500_000)}; para R$ 8.000/mês → ${brl(2_400_000)}; para R$ 15.000/mês → ${brl(4_500_000)}.`,
          "A regra dos 4% presume retiradas ajustadas pela inflação e uma carteira diversificada; é a referência usada por planejadores financeiros no mundo todo.",
        ],
      },
      {
        titulo: "Passo 2 — o aporte necessário (exemplos)",
        paragrafos: [
          "A tabela abaixo mostra o aporte mensal necessário para chegar ao patrimônio alvo em 15 anos (considerando rentabilidade real de 5,5% ao ano e reinvestimento):",
        ],
        lista: [
          {
            titulo: "Alvo R$ 1,5 milhão",
            corpo: "≈ R$ 5.200/mês em 15 anos — ou ≈ R$ 3.000/mês em 20 anos.",
          },
          {
            titulo: "Alvo R$ 2,4 milhões",
            corpo: "≈ R$ 8.300/mês em 15 anos — ou ≈ R$ 4.800/mês em 20 anos.",
          },
          {
            titulo: "Alvo R$ 4,5 milhões",
            corpo: "≈ R$ 15.600/mês em 15 anos — ou ≈ R$ 9.000/mês em 20 anos.",
          },
        ],
      },
      {
        titulo: "Passo 3 — ajuste o prazo em vez de exigências impossíveis",
        paragrafos: [
          `Se os valores acima parecem altos, o contraponto é o tempo: em 25 anos com a mesma rentabilidade, o aporte necessário cai pela metade em relação a 15 anos. O movimento mais poderoso de todos é começar cedo (juros compostos) e aumentar o aporte à medida que a renda cresce.`,
          "Use a calculadora de juros compostos do site para simular o seu cenário com precisão.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto investir por mês para viver de renda em 15 anos?",
        a: "Depende do patrimônio alvo. Para cobrir R$ 5.000/mês (alvo de R$ 1,5 milhão) em 15 anos com retorno real de 5,5% a.a., o aporte necessário é ~R$ 5.200/mês. Prazos maiores reduzem muito o valor.",
      },
      {
        q: "Qual a regra do 4% para aposentadoria?",
        a: "É a referência de retirada segura: retire até 4% do patrimônio ao ano, ajustados por inflação, para que a carteira dure décadas mesmo em mercados ruins.",
      },
      {
        q: "Quantos anos preciso investir para viver de renda?",
        a: "Depende da taxa de poupança em relação à renda: quem poupa 20% da renda normalmente chega à independência entre 25 e 35 anos; quem poupa 50%, por volta de 17 anos. Quanto maior o aporte, menor o prazo.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-sao-dividendos",
    categoria: "Educação",
    titulo: "O que são dividendos e como recebê-los?",
    descricao:
      "O que são dividendos, como as empresas pagam, quais empresas pagam mais no Brasil e como receber proventos isentos de IR.",
    h1: "O que são dividendos?",
    intro:
      "Dividendo é a parte do lucro da empresa distribuída aos acionistas — o acionista recebe em dinheiro, sem precisar vender nada. Empresas maduras e rentáveis costumam distribuir parte de seus lucros todos os anos, e para quem acumula posições isso se transforma em um fluxo de renda recorrente.",
    secoes: [
      {
        titulo: "Como funcionam na prática",
        paragrafos: [
          "A empresa anuncia um dividendo por ação (ex.: R$ 1,00 por ação), define uma data-limite (data ex) e paga na data de pagamento. Quem compra até a data ex recebe o provento em caixa.",
          "Entre a data ex e o pagamento, o preço da ação costuma ajustar pelo valor do provento — o dividendo não é 'dinheiro de graça', é a distribuição de parte do lucro já incorporado ao valor.",
        ],
        lista: [
          {
            titulo: "Isenção",
            corpo:
              "Pessoa física é isenta de IR sobre dividendos dentro das regras atuais — diferentemente dos juros de renda fixa.",
          },
          {
            titulo: "Data ex",
            corpo:
              "Comprar até a data ex garante o dividendo; quem compra na data ex-dividendo não o recebe.",
          },
          {
            titulo: "Yield on cost",
            corpo:
              "Comparar o provento atual com o preço médio que você pagou: é o melhor indicador de construção de renda.",
          },
        ],
      },
      {
        titulo: "Quais empresas pagam mais no Brasil",
        paragrafos: [
          "Tradicionalmente os setores mais pagadores incluem bancos (distribuindo parte consistente do lucro), elétricas, saneamento, mineração e algumas empresas de energia e telecomunicação. O pagamento não é garantido: pode ser reduzido ou suspenso em crises.",
          "Acompanhar o histórico de pagamentos dos últimos anos e a consistência do lucro da operação é mais relevante do que o yield do momento.",
        ],
      },
      {
        titulo: "Como investir em dividendos com disciplina",
        paragrafos: [
          "Monte uma carteira com mais de 10 posições de setores diferentes, reinvestindo os proventos nos primeiros anos. Registre cada provento recebido para acompanhar o crescimento do yield on cost ano a ano.",
          "O ciclo virtuoso é simples: mais patrimônio → mais dividendos → mais patrimônio.",
        ],
      },
    ],
    faq: [
      {
        q: "O que são dividendos exatos?",
        a: "São a parte do lucro da empresa distribuída aos acionistas em dinheiro. Os acionistas continuam com as ações e recebem o provento — normalmente a cada seis meses ou anualmente.",
      },
      {
        q: "Dividendos pagam imposto de renda?",
        a: "Por pessoa física, dividendos distribuídos são hoje isentos de IR. Já os Juros sobre Capital Próprio (JCP) pagam 15% de IR na fonte.",
      },
      {
        q: "Como receber dividendos automaticamente?",
        a: "Com as ações em custódia na corretora, o pagamento cai automaticamente na sua conta quando o provento é pago. Recomenda-se reinvestir ou direcionar para o plano de retirada.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-fundo-imobiliario-fii",
    categoria: "FIIs",
    titulo: "O que é um FII (fundo imobiliário) e como investir?",
    descricao:
      "O que são fundos imobiliários, como os FIIs pagam renda mensal isenta, principais segmentos e cuidados antes de investir.",
    h1: "O que é um FII (fundo imobiliário)?",
    intro:
      "Um FII é um fundo que investe em imóveis (aluguéis) ou em títulos ligados ao crédito imobiliário e divide o resultado entre os cotistas — que compram cotas negociadas na B3. O ponto de atração: renda mensal recorrente, muitas vezes isenta de IR para pessoa física.",
    secoes: [
      {
        titulo: "Como o FII gera renda",
        paragrafos: [
          "O fundo distribui a maior parte do lucro mensalmente aos cotistas. Por regra, o FII deve distribuir pelo menos 95% do lucro auferido no período.",
          "Os segmentos principais: fundos de tijolo (galpões logísticos, shoppings, lajes corporativas, hospitais), FIIs de papel (CRIs e títulos imobiliários) e fundos híbridos.",
        ],
        lista: [
          {
            titulo: "Renda mensal",
            corpo:
              "Distribuição dos resultados, geralmente mensal; proventos de FII são isentos de IR para PF nas regras atuais.",
          },
          {
            titulo: "Liquidez",
            corpo: "Cotas negociadas na B3 como ações — dá para vender quando quiser em pregão.",
          },
          {
            titulo: "Risco",
            corpo: "Vacância, inadimplência de locatários, gestão ruim e volatilidade das cotas.",
          },
        ],
      },
      {
        titulo: "O que olhar antes de comprar",
        paragrafos: [
          "Dividend yield (rendimento dos últimos 12 meses sobre o preço), P/VP (cota sobre o valor patrimonial) e a vacância dos imóveis são os três números mais usados pela comunidade de FIIs.",
          "Desconfie de yields altíssimos e de preço muito distante do valor patrimonial: podem indicar distribuição de lucro não recorrente (como venda de imóveis) ou carteira de baixa qualidade.",
        ],
      },
      {
        titulo: "Onde o FII encaixa no plano de 15 anos",
        paragrafos: [
          "FIIs são tradicionalmente uma boa fonte de renda recorrente na fase de retirada (após a consolidação do patrimônio). Na fase de acúmulo, comprar cotas em quedas de preço aumenta o dividend yield da posição. Como qualquer classe, não concentre: limite a exposição e mantenha diversificação.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é um FII?",
        a: "Fundo de investimento imobiliário: os cotistas compram fração de um portfólio de imóveis ou títulos imobiliários e recebem mensalmente a distribuição de resultados, com isenção de IR para PF.",
      },
      {
        q: "FII paga renda todo mês?",
        a: "A maioria dos FIIs do mercado faz distribuições mensais, mas o valor varia conforme a performance do fundo e a ocupação dos imóveis — não é renda garantida.",
      },
      {
        q: "Qual o risco de um FII?",
        a: "Vacância, inadimplência, gestão ruim, concentração geográfica e quedas das cotas. Diversificar entre fundos e segmentos é a principal defesa.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-100-mil-por-mes",
    categoria: "Simulação",
    titulo: "Quanto rende 100 mil por mês? Simulação completa",
    descricao:
      "Simule quanto rendem 100 mil reais por mês em poupança, CDB, Tesouro, FIIs e ações — comparativo com valores de curto e longo prazo.",
    h1: "Quanto rende 100 mil reais por mês?",
    intro: `100 mil reais não compram um imóvel, mas geram uma renda mensal que varia bastante conforme o veículo escolhido: da poupança (que muitas vezes perde para a inflação) ao CDB e Tesouro (que acompanham a Selic) e às cotas de fundos imobiliários e ações de dividendos (renda variável).`,
    secoes: [
      {
        titulo: "Tabela comparativa (cenário de Selic em ~12% a.a.)",
        paragrafos: [
          `Poupança: ~${brl(500)}/mês (0,5% a.m.) — mas frequentemente abaixo da inflação em cenários de preços elevados.`,
          `CDB 100% do CDI: ~${brl(1_000)} brutos/mês; líquido no longo prazo ~${brl(850)}/mês.`,
          `Tesouro Selic: ~${brl(1_000)} brutos/mês (acompanha a taxa básica).`,
          `FIIs (yield de ~9% a.a.): ~${brl(750)}/mês*, variável e isento de IR.`,
          `Ações de dividendos (yield de ~6% a.a.): ~${brl(500)}/mês, com potencial de apreciação.`,
        ],
      },
      {
        titulo: "Por que a rentabilidade bruta não é a verdade",
        paragrafos: [
          "Compare sempre o líquido: renda fixa paga IR regressivo; FIIs e dividendos são isentos; a poupança não tem custo, mas perde para a inflação em boa parte dos cenários.",
          "Outra variável é o prazo: 100 mil hoje, reinvestidos a 1% ao mês, podem superar R$ 400 mil em 15 anos pelos juros compostos (sem considerar inflação).",
        ],
      },
      {
        titulo: "Onde começar com 100 mil",
        paragrafos: [
          "Reserve de emergência em Tesouro Selic (6 meses de custo de vida), depois CDB de longo prazo para estabilidade e, se o horizonte for a renda passiva, uma parte em renda variável (FIIs e ações de dividendos) — diversificada e investida por muitos anos.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende 100 mil na poupança por mês?",
        a: "Com a Selic acima de 8,5% a.a., a poupança rende 0,5% ao mês (~R$ 500 sobre 100 mil), mas não acompanha o custo de vida quando a inflação é alta.",
      },
      {
        q: "100 mil é suficiente para viver de renda?",
        a: "Dificilmente: pela regra dos 4%, 100 mil geraria apenas R$ 4 mil por ano. É um ótimo primeiro tijolo — o caminho é multiplicá-lo com aportes consistentes e reinvestimento.",
      },
      {
        q: "Qual o melhor CDB ou título para 100 mil?",
        a: "Para curto prazo, Tesouro Selic ou CDB com liquidez diária de 100% do CDI; para horizonte de mais de 5 anos, Tesouro IPCA+ com taxa elevada, que protege o poder de compra.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
];

/** Slug -> conteúdo, para lookup rápido na rota e no sitemap. */
export const CONTEUDO_POR_SLUG = new Map(CONTEUDOS.map((c) => [c.slug, c]));

/** Caminho público da página de um conteúdo. */
export const caminhoConteudo = (slug: string) => `/conteudo/${slug}`;
