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
  {
    slug: "quanto-rende-500-mil-por-mes",
    categoria: "Simulação",
    titulo: "Quanto rende 500 mil por mês? Comparativo",
    descricao:
      "Quanto rendem 500 mil reais por mês em CDB, Tesouro Selic, FIIs e ações — com valores brutos, líquidos e o que dá para viver de renda.",
    h1: "Quanto rende 500 mil reais por mês?",
    intro: `Com ${brl(500_000)} aplicados, a renda mensal fica entre ~${brl(2_500)} e ~${brl(5_000)}, dependendo do ativo e da taxa de juros do momento. Metade de 1 milhão não gera metade da renda em todos os casos: a tributação e o yield mudam a conta. Este comparativo mostra os valores por classe.`,
    secoes: [
      {
        titulo: "Os números por classe (Selic em ~12% a.a.)",
        paragrafos: [
          `CDB 100% do CDI: ~${brl(5_000)} brutos/mês; ~${brl(4_250)} líquidos após IR de longo prazo.`,
          `Tesouro Selic: ~${brl(5_000)} brutos/mês, com liquidez diária.`,
          `FIIs (yield de ~9% a.a.): ~${brl(3_750)}/mês, variável e isento de IR.`,
          `Ações de dividendos (yield de ~6% a.a.): ~${brl(2_500)}/mês, com potencial de apreciação.`,
        ],
      },
      {
        titulo: "E pela regra da retirada segura?",
        paragrafos: [
          "Pelo critério dos 4% ao ano — o que sustenta a carteira por décadas — 500 mil permitem retirar ~R$ 20 mil anuais, cerca de R$ 1.700/mês, ajustados pela inflação.",
          "A diferença é importante: renda bruta dos juros não é o mesmo que retirada sustentável. Quem pretende viver do patrimônio deve se guiar pela retirada segura, não pelo yield do momento.",
        ],
      },
      {
        titulo: "Como fazer 500 mil renderem mais",
        paragrafos: [
          "Reinvestir a renda dos primeiros anos, alocar parte em ativos de crescimento (ações, FIIs, ETFs) e revisar a alocação uma ou duas vezes por ano são as alavancas que aceleram o caminho para a independência financeira.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende 500 mil no Tesouro Selic por mês?",
        a: "Com Selic em torno de 12% a.a., cerca de R$ 5.000 brutos/mês. Líquido de IR no prazo longo, ~R$ 4.250/mês.",
      },
      {
        q: "500 mil é suficiente para viver de renda?",
        a: "Pela regra dos 4%, permite retirar ~R$ 1.700/mês com segurança. Cobre um custo de vida enxuto, mas para uma renda de R$ 5.000/mês o alvo sobe para ~R$ 1,5 milhão.",
      },
      {
        q: "O que rende mais com 500 mil: FIIs ou CDB?",
        a: "Em yield mensal bruto, FIIs de ~9% pagam menos que um CDB 100% do CDI com Selic a 12%, mas são isentos de IR e podem apreciar. Em cenários de juros menores, FIIs tendem a pagar mais. Não há resposta universal.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-5-milhoes-por-mes",
    categoria: "Simulação",
    titulo: "Quanto rende 5 milhões por mês? Simulação",
    descricao:
      "Quanto rendem 5 milhões de reais por mês na renda fixa, em FIIs e em ações — e quanto dá para retirar com segurança sem comprometer o patrimônio.",
    h1: "Quanto rende 5 milhões de reais por mês?",
    intro: `Com ${brl(5_000_000)}, o rendimento mensal bruto fica entre ~${brl(25_000)} e ~${brl(50_000)}, dependendo da alocação e da taxa de juros. Este montante já coloca o investidor em posição de viver de renda na maioria dos padrões de vida brasileiros — a discussão passa a ser proteção e retirada sustentável.`,
    secoes: [
      {
        titulo: "Os números por classe (Selic em ~12% a.a.)",
        paragrafos: [
          `CDB 100% do CDI: ~${brl(50_000)} brutos/mês; ~${brl(42_500)} líquidos após IR de longo prazo.`,
          `Tesouro Selic: ~${brl(50_000)} brutos/mês, liquidez diária.`,
          `FIIs (yield de ~9% a.a.): ~${brl(37_500)}/mês, variável e isento de IR.`,
          `Ações de dividendos (yield de ~6% a.a.): ~${brl(25_000)}/mês, com potencial de apreciação e crescimento de proventos.`,
        ],
      },
      {
        titulo: "Retirada segura com 5 milhões",
        paragrafos: [
          "Pela regra dos 4%, o valor anual retirável é ~R$ 200 mil — cerca de R$ 16.600/mês, ajustados pela inflação, com baixo risco de exaustão em prazos de 30+ anos.",
          "Com 5 milhões, a diversificação importa ainda mais: dividir entre renda fixa, renda variável brasileira e exposição internacional reduz a dependência de um único cenário de juros ou de moeda.",
        ],
        lista: [
          {
            titulo: "Proteção",
            corpo: "Tesouro IPCA+ para a parcela que cobre o custo de vida fixo por anos.",
          },
          {
            titulo: "Crescimento",
            corpo:
              "Ações de dividendos e ETFs internacionais para preservar o poder de compra no longo prazo.",
          },
          {
            titulo: "Caixa mensal",
            corpo: "FIIs e CDB 100% do CDI para a renda recorrente e a reserva de liquidez.",
          },
        ],
      },
      {
        titulo: "Cuidados fiscais e de sucessão",
        paragrafos: [
          "Com patrimônio grande, a tributação (IR regressivo da renda fixa, 15% sobre ganho de capital, isenção de dividendos e FIIs) e a estruturação da carteira fazem diferença material. Vale revisar a alocação com planejamento e registrar tudo na plataforma para acompanhar o yield on cost real.",
        ],
      },
    ],
    faq: [
      {
        q: "5 milhões rendem quanto por mês na renda fixa?",
        a: "Com Selic em ~12% a.a., ~R$ 50.000 brutos/mês (CDB 100% do CDI); líquidos após IR de longo prazo, ~R$ 42.500/mês.",
      },
      {
        q: "É possível viver de renda com 5 milhões?",
        a: "Sim, com folga na maioria dos padrões de vida: pela regra dos 4%, dá para retirar ~R$ 16.600/mês com segurança, além da renda bruta dos juros.",
      },
      {
        q: "Como investir 5 milhões com segurança?",
        a: "Diversificando entre renda fixa (Selic e IPCA+), FIIs, ações de dividendos e exposição internacional, com retirada limitada a ~4% ao ano e revisão anual.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-10-mil-por-mes",
    categoria: "Simulação",
    titulo: "Quanto rende 10 mil reais por mês?",
    descricao:
      "Quanto rendem 10 mil reais por mês em poupança, CDB, Tesouro Selic, FIIs e ações — e por que o valor importa menos que a constância.",
    h1: "Quanto rende 10 mil reais por mês?",
    intro: `${brl(10_000)} é um valor de entrada típico para quem está começando: na renda fixa, rende cerca de R$ 85 a R$ 100 líquidos por mês com juros em ~12% ao ano. Parece pouco — e é: o que constrói patrimônio é a repetição do aporte ao longo dos anos, não o rendimento isolado dele.`,
    secoes: [
      {
        titulo: "Os valores por classe",
        paragrafos: [
          `Poupança: ~${brl(50)}/mês (0,5% a.m. com Selic acima de 8,5% a.a.).`,
          `CDB 100% do CDI: ~${brl(100)} brutos/mês; ~${brl(85)} líquidos no longo prazo.`,
          `Tesouro Selic: ~${brl(100)} brutos/mês, liquidez diária.`,
          `FIIs (yield de ~9% a.a.): ~${brl(75)}/mês, variável e isento de IR — pouco relevante com valor único.`,
          `Ações de dividendos (yield de ~6% a.a.): ~${brl(50)}/mês, com potencial de apreciação.`,
        ],
      },
      {
        titulo: "O que realmente importa: a constância",
        paragrafos: [
          "10 mil por mês, durante 12 meses, são 120 mil investidos. Reinvestindo tudo a ~0,8% ao mês, o montante de 15 anos com aporte mensal de 10 mil supera R$ 3,8 milhões — o rendimento mensal desse patrimônio já cobre um custo de vida confortável.",
          "A matemática dos juros compostos premia quem começa cedo e não interrompe os aportes, mesmo com valores pequenos no início.",
        ],
      },
      {
        titulo: "Onde alocar os primeiros 10 mil",
        paragrafos: [
          "Primeiro complete a reserva de emergência (6 meses de custo de vida em Tesouro Selic ou CDB com liquidez diária). Só depois distribua entre renda fixa de prazo, FIIs e ações de dividendos, respeitando o seu perfil.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende 10 mil reais na poupança por mês?",
        a: "Cerca de R$ 50/mês (0,5% a.m.), com a Selic acima de 8,5% a.a. — geralmente abaixo da inflação.",
      },
      {
        q: "Vale a pena investir 10 mil reais?",
        a: "Sim, se for o início de uma rotina de aportes. Um único aporte gera renda pequena, mas 10 mil/mês reinvestidos por 15 anos podem superar R$ 3,8 milhões.",
      },
      {
        q: "Onde investir os primeiros 10 mil?",
        a: "Complete a reserva de emergência em Tesouro Selic e depois diversifique em renda fixa, FIIs e ações, conforme o seu perfil e prazo.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-1-mil-por-mes",
    categoria: "Simulação",
    titulo: "Quanto rende mil reais por mês? Primeiros passos",
    descricao:
      "Quanto rendem mil reais por mês na renda fixa e na poupança — e como transformar o primeiro aporte em uma rotina que constrói patrimônio.",
    h1: "Quanto rende 1 mil reais por mês?",
    intro: `${brl(1_000)} aplicados rendem cerca de R$ 10 brutos por mês em um CDB 100% do CDI com juros a ~12% ao ano (R$ 8,50 líquidos no prazo longo). É o valor de partida de quase todo investidor brasileiro — e o mais importante dele não é o rendimento, é o hábito de aportar todos os meses.`,
    secoes: [
      {
        titulo: "O que 1 mil rende hoje",
        paragrafos: [
          `Poupança: ~${brl(5)}/mês (0,5% a.m. com Selic acima de 8,5% a.a.).`,
          `CDB 100% do CDI: ~${brl(10)} brutos/mês; ~${brl(8)} líquidos no prazo longo.`,
          `Tesouro Selic: ~${brl(10)} brutos/mês, com liquidez diária.`,
          "Com 1 mil único, FIIs e ações quase não produzem renda perceptível — o foco deve ser o acúmulo.",
        ],
      },
      {
        titulo: "O efeito do aporte mensal",
        paragrafos: [
          "Mil reais por mês a ~0,8% a.m. viram ~R$ 380 mil em 15 anos (reinvestindo tudo). A partir daí, o rendimento mensal é de ~R$ 3.000 — muito maior que os R$ 10 do primeiro mês.",
          "A constância é a variável mais forte: dobrar a frequência dos aportes vale mais do que buscar taxas ligeiramente melhores.",
        ],
      },
      {
        titulo: "Estratégia para começar com pouco",
        paragrafos: [
          "Automatize o aporte no dia do salário, mantenha-o em renda fixa líquida (Tesouro Selic ou CDB 100% do CDI) até formar a reserva, e só depois adicione renda variável. Use a calculadora de juros compostos do site para projetar o seu cenário.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende mil reais por mês na renda fixa?",
        a: "Com juros a ~12% a.a., cerca de R$ 10 brutos/mês em um CDB 100% do CDI; ~R$ 8,50 líquidos no prazo longo.",
      },
      {
        q: "Vale investir só mil reais?",
        a: "Sim: o importante é a rotina. Mil reais mensais reinvestidos por 15 anos podem chegar a ~R$ 380 mil.",
      },
      {
        q: "Onde deixar os primeiros mil reais?",
        a: "Tesouro Selic ou CDB com liquidez diária de 100% do CDI, até formar a reserva de emergência.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-renda-fixa",
    categoria: "Educação",
    titulo: "O que é renda fixa? Guia completo",
    descricao:
      "O que é renda fixa, quais são os tipos de título (pós, pré, inflação), como funciona o IR regressivo e onde investir no Brasil.",
    h1: "O que é renda fixa?",
    intro:
      "Renda fixa é a classe de investimentos em que o retorno é previsível no momento da aplicação — pode ser atrelado a uma taxa (CDI, Selic), a um valor prefixado ou à inflação. É a base da reserva de emergência e o estabilizador de qualquer carteira de longo prazo.",
    secoes: [
      {
        titulo: "Os três tipos de rentabilidade",
        paragrafos: [
          "Pós-fixada: acompanha uma taxa de referência — CDI ou Selic. O valor não é conhecido antes, mas flutua pouco e tende a acompanhar a economia.",
          "Prefixada: o retorno total é definido na compra (ex.: 14% a.a. por 3 anos). Sobe quando o mercado espera juros menores no futuro.",
          "Inflação (IPCA+): paga a inflação do período mais uma taxa fixa. É a proteção clássica do poder de compra em prazos longos.",
        ],
        lista: [
          {
            titulo: "CDB e LC",
            corpo: "Títulos bancários cobertos pelo FGC até R$ 250 mil por instituição.",
          },
          {
            titulo: "Tesouro Direto",
            corpo: "Títulos do governo federal — Selic, prefixado e IPCA+.",
          },
          {
            titulo: "LCI/LCA, CRI/CRA",
            corpo: "Crédito imobiliário e do agronegócio, isentos de IR para pessoa física.",
          },
        ],
      },
      {
        titulo: "Tributação: o IR regressivo",
        paragrafos: [
          "A maioria dos títulos de renda fixa paga IR regressivo: 22,5% até 180 dias, 20% até 1 ano, 17,5% até 2 anos e 15% após 2 anos. Quanto mais tempo o dinheiro fica aplicado, menor o imposto.",
          "LCI/LCA, CRI e CRA são isentos para pessoa física, mas costumam pagar taxas menores que o CDI — a isenção compensa conforme o prazo.",
        ],
      },
      {
        titulo: "Quando a renda fixa é a escolha certa",
        paragrafos: [
          "Para a reserva de emergência (Tesouro Selic ou CDB com liquidez diária), para metas de curto e médio prazo e como contrapeso à volatilidade da renda variável. Em cenários de juros altos, a renda fixa ainda atrai — mas quem busca renda crescente no longo prazo combina com dividendos e FIIs.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é renda fixa?",
        a: "É a classe de investimentos com retorno previsível no momento da aplicação: atrelado ao CDI/Selic, a uma taxa prefixada ou à inflação.",
      },
      {
        q: "Qual a diferença entre CDB e Tesouro Direto?",
        a: "CDB é um título emitido por banco, garantido pelo FGC até R$ 250 mil por instituição. Tesouro Direto é título do governo federal, garantido pelo Tesouro Nacional.",
      },
      {
        q: "Renda fixa paga imposto de renda?",
        a: "Sim, a maioria: IR regressivo de 22,5% a 15% conforme o prazo. LCI/LCA, CRI e CRA são isentos para pessoa física.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-tesouro-direto",
    categoria: "Renda fixa",
    titulo: "O que é Tesouro Direto e como funciona?",
    descricao:
      "O que é Tesouro Direto, quais são os títulos (Selic, prefixado, IPCA+), como comprar, custos, liquidez e quando usar cada um.",
    h1: "O que é Tesouro Direto?",
    intro:
      "Tesouro Direto é o programa do governo federal para pessoa física comprar títulos públicos. É considerado o investimento de menor risco de crédito do Brasil — quem emite é o Tesouro Nacional — e aceita aportes a partir de cerca de R$ 30.",
    secoes: [
      {
        titulo: "Os três tipos de título",
        paragrafos: [
          "Tesouro Selic: pós-fixado, acompanha a taxa básica com liquidez diária — a escolha padrão para reserva de emergência.",
          "Tesouro Prefixado: retorno total definido na compra; ideal para metas com data conhecida e previsibilidade.",
          "Tesouro IPCA+: paga inflação + taxa fixa; a proteção de longo prazo contra a perda de poder de compra.",
        ],
      },
      {
        titulo: "Como comprar e custos",
        paragrafos: [
          "A compra é feita pelo site ou aplicativo do Tesouro, por bancos e corretoras. Hoje a taxa da B3 foi zerada, sobrando apenas eventuais taxas de corretora e o imposto de renda regressivo (22,5% a 15%).",
          "O valor mínimo por título é pequeno, o que permite começar com aportes baixos e automáticos.",
        ],
      },
      {
        titulo: "Liquidez e marcação a mercado",
        paragrafos: [
          "Todos os títulos têm liquidez diária, mas vender antes do vencimento pode gerar perda ou ganho conforme a variação das taxas (marcação a mercado). O Tesouro Selic flutua pouco; prefixados e IPCA+ oscilam mais.",
          "Regra prática: prazos acima de 5 anos combinam com IPCA+; metas curtas combinam com Selic.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é Tesouro Direto?",
        a: "É o programa de compra de títulos públicos pelo Tesouro Nacional, com investimento inicial baixo e liquidez diária.",
      },
      {
        q: "Qual Tesouro é melhor para reserva de emergência?",
        a: "O Tesouro Selic, por ter liquidez diária e acompanhar a taxa básica com baixíssima oscilação de preço.",
      },
      {
        q: "Tesouro Direto tem risco?",
        a: "Risco de crédito mínimo (governo federal), mas há risco de mercado: vender antes do vencimento pode resultar em perda dependendo das taxas.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-cdb",
    categoria: "Renda fixa",
    titulo: "O que é CDB? Guia do título bancário",
    descricao:
      "O que é CDB, como funciona a garantia do FGC, os tipos de rentabilidade (CDI, prefixado), liquidez e como escolher um CDB.",
    h1: "O que é CDB?",
    intro:
      "CDB (Certificado de Depósito Bancário) é um título emitido por bancos para captar recursos: você empresta dinheiro ao banco e recebe juros no vencimento. É um dos investimentos de renda fixa mais populares do Brasil, com proteção do FGC.",
    secoes: [
      {
        titulo: "Como funciona e quem garante",
        paragrafos: [
          "O banco define a rentabilidade — normalmente um percentual do CDI (ex.: 100%, 110%) ou uma taxa prefixada. No vencimento, você recebe o valor investido mais os juros.",
          "O FGC (Fundo Garantidor de Créditos) protege até R$ 250 mil por banco e por conjunto de CPF, incluindo juros. Valores acima disso ficam expostos ao risco do banco.",
        ],
      },
      {
        titulo: "Liquidez e tributação",
        paragrafos: [
          "Há CDBs com liquidez diária (resgate a qualquer momento) e com vencimento fixo (resgate antecipado gera marcação a mercado, podendo render menos).",
          "O IR é regressivo: 22,5% até 180 dias, 20% até 1 ano, 17,5% até 2 anos e 15% após 2 anos.",
        ],
      },
      {
        titulo: "Como escolher um bom CDB",
        paragrafos: [
          "Compare o percentual do CDI, o prazo, a liquidez e a solidez do banco emissor. CDBs de bancos menores pagam mais (110%+, 115%+), mas exija o FGC e avalie se o retorno extra compensa o risco e o prazo de carência.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é CDB?",
        a: "Certificado de Depósito Bancário: título de renda fixa em que você empresta dinheiro a um banco e recebe juros no vencimento, com garantia do FGC até R$ 250 mil.",
      },
      {
        q: "CDB paga imposto de renda?",
        a: "Sim: IR regressivo de 22,5% a 15%, conforme o prazo da aplicação.",
      },
      {
        q: "Qual CDB rende mais: 100% do CDI ou 110%?",
        a: "O de 110% do CDI, em tese, paga mais. Mas avalie prazo, liquidez e solidez do banco — o adicional deve compensar os riscos.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-tesouro-ipca",
    categoria: "Renda fixa",
    titulo: "O que é Tesouro IPCA+ e quando usar?",
    descricao:
      "O que é o Tesouro IPCA+, como funciona a proteção contra a inflação, os prazos ideais, o cupom semestral e os cuidados com a marcação a mercado.",
    h1: "O que é Tesouro IPCA+?",
    intro:
      "Tesouro IPCA+ é o título público que paga a inflação oficial (IPCA) mais uma taxa fixa definida na compra. É a ferramenta mais direta para proteger o poder de compra do dinheiro em horizontes longos — de 5 a 30 anos.",
    secoes: [
      {
        titulo: "Como funciona o rendimento",
        paragrafos: [
          "Na compra, você trava a taxa real (ex.: IPCA + 6% a.a.). A cada semestre, o valor aplicado é corrigido pela inflação do período e, ao final, recebe a soma da inflação acumulada mais a taxa fixa.",
          "A taxa fixa é o prêmio real: quanto mais alta a taxa de mercado na compra, maior o retorno real garantido.",
        ],
      },
      {
        titulo: "Variações: com e sem juros semestrais",
        paragrafos: [
          "O Tesouro IPCA+ tradicional paga tudo no vencimento. A versão 'com juros semestrais' paga cupons a cada 6 meses — útil para quem quer renda periódica, mas o valor investido corrige mais devagar.",
          "Para quem está acumulando, a versão sem cupons costuma ser mais eficiente, pois os juros continuam compostos dentro do título.",
        ],
      },
      {
        titulo: "O que observar antes de investir",
        paragrafos: [
          "Marcação a mercado: se você vender antes do vencimento e as taxas subirem, o preço do título cai — pode haver perda nominal. Por isso, o IPCA+ é recomendado para dinheiro que não será usado por vários anos.",
          "Use o IPCA+ para a parcela do plano de aposentadoria que cobre o custo de vida fixo: é a renda que não depende do mercado.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é Tesouro IPCA+?",
        a: "Título público que paga a inflação (IPCA) mais uma taxa fixa definida na compra — proteção direta do poder de compra em prazos longos.",
      },
      {
        q: "Tesouro IPCA+ tem risco de perder dinheiro?",
        a: "Se levado até o vencimento, não perde valor real. Vendendo antes, a marcação a mercado pode gerar perda se as taxas subirem.",
      },
      {
        q: "Tesouro IPCA+ ou Tesouro Selic?",
        a: "Para metas curtas e reserva, Selic. Para prazos acima de 5 anos e proteção da inflação, IPCA+.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-tesouro-selic",
    categoria: "Renda fixa",
    titulo: "O que é Tesouro Selic e para que serve?",
    descricao:
      "O que é o Tesouro Selic, como ele acompanha a taxa básica, por que é ideal para reserva de emergência e quanto rende.",
    h1: "O que é Tesouro Selic?",
    intro:
      "Tesouro Selic é o título público pós-fixado que acompanha a taxa Selic do dia a dia, com liquidez diária e oscilação de preço mínima. É a referência brasileira de segurança e o destino natural da reserva de emergência.",
    secoes: [
      {
        titulo: "Como funciona",
        paragrafos: [
          "O título é corrigido pela taxa básica de juros: quando a Selic está em 12% a.a., o Tesouro Selic rende aproximadamente isso ao ano, dia a dia, sem surpresa de preço.",
          "Ao contrário dos títulos prefixados, o Tesouro Selic quase não sofre marcação a mercado — vender antes do vencimento raramente gera perda relevante.",
        ],
      },
      {
        titulo: "Para que serve",
        paragrafos: [
          "Reserva de emergência (6 a 12 meses de custo de vida), metas de curto prazo (menos de 2 anos) e a parte estável da carteira que você pode precisar a qualquer momento.",
          "Quando a Selic está alta, ele ainda oferece rendimento atrativo com risco baixíssimo — mas não deve ser a única alocação de quem busca crescimento de longo prazo.",
        ],
      },
      {
        titulo: "Quanto rende e quais custos",
        paragrafos: [
          "Com Selic em ~12% a.a., 10 mil no Tesouro Selic rendem ~R$ 100 brutos/mês. O IR é regressivo (22,5% a 15%) e a taxa da B3 foi zerada, restando eventuais taxas de corretora.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é Tesouro Selic?",
        a: "Título público pós-fixado que acompanha a taxa Selic, com liquidez diária e oscilação de preço mínima.",
      },
      {
        q: "Tesouro Selic é seguro?",
        a: "É o investimento de menor risco de crédito do país (governo federal) e praticamente não perde com marcação a mercado.",
      },
      {
        q: "Tesouro Selic rende quanto por mês?",
        a: "Aproximadamente a Selic anual: com juros a 12% a.a., ~1% ao mês bruto, sujeito ao IR regressivo.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-independencia-financeira",
    categoria: "Planejamento",
    titulo: "O que é independência financeira?",
    descricao:
      "O que é independência financeira, como calcular o patrimônio necessário, a diferença para liberdade financeira e o caminho para alcançá-la.",
    h1: "O que é independência financeira?",
    intro:
      "Independência financeira é o ponto em que a renda dos seus investimentos cobre 100% do seu custo de vida, tornando o trabalho uma escolha. Não é preciso ser milionário: basta que o patrimônio gere renda suficiente — e sustentável — para os seus padrões de vida.",
    secoes: [
      {
        titulo: "O número da independência",
        paragrafos: [
          `A referência clássica: patrimônio necessário = custo de vida mensal × 300 (regra da retirada segura de 4%). Para R$ 5.000/mês → ${brl(1_500_000)}; para R$ 8.000/mês → ${brl(2_400_000)}.`,
          "Se você prefere viver só de renda (dividendos e proventos), use um yield real conservador: patrimônio = renda mensal × 12 ÷ yield. Com yield de 5% a.a., R$ 5.000/mês exigem ~R$ 1,2 milhão.",
        ],
      },
      {
        titulo: "Independência x liberdade financeira",
        paragrafos: [
          "Independência financeira é o marco matemático — a renda passiva cobre as despesas. Liberdade financeira é a consequência prática: poder escolher trabalhar menos, mudar de carreira ou parar, sem depender do salário.",
          "Antes da independência total existe a 'semi-independência': quando a renda passiva cobre parte das despesas (por exemplo, 50%), reduzindo a pressão da renda ativa.",
        ],
      },
      {
        titulo: "O caminho em 4 movimentos",
        paragrafos: [
          "1) Defina o número (custo de vida × 300). 2) Mantenha taxa de poupança alta e aportes automáticos. 3) Aloque em renda fixa, ações, FIIs e exterior, com reinvestimento total na fase de acúmulo. 4) Acompanhe o percentual do custo de vida coberto pela renda passiva — é o placar da independência.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é independência financeira?",
        a: "É quando a renda dos seus investimentos cobre 100% do seu custo de vida, tornando o trabalho opcional.",
      },
      {
        q: "Quanto preciso para a independência financeira?",
        a: "Pela regra dos 4%, multiplique o custo de vida mensal por 300: R$ 5.000/mês exigem cerca de R$ 1,5 milhão investido.",
      },
      {
        q: "Qual a diferença entre independência e liberdade financeira?",
        a: "Independência é o marco matemático (renda passiva cobre as despesas); liberdade é o efeito prático de poder escolher o que fazer da vida sem depender do salário.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "regra-dos-4-para-retirada-segura",
    categoria: "Planejamento",
    titulo: "Regra dos 4%: retirada segura na prática",
    descricao:
      "O que é a regra dos 4% (retirada segura), de onde ela vem, como aplicar no Brasil e quando usar taxas menores.",
    h1: "Regra dos 4%: quanto retirar sem acabar com o patrimônio",
    intro:
      "A regra dos 4% diz que você pode retirar 4% do patrimônio no primeiro ano de aposentadoria — e corrigir esse valor pela inflação todos os anos — com alta probabilidade de a carteira durar 30 anos ou mais. É a referência mais usada por planejadores financeiros do mundo.",
    secoes: [
      {
        titulo: "De onde vem o número",
        paragrafos: [
          "O estudo 'Trinity Study' (1998) analisou décadas de mercado americano e concluiu que a retirada inicial de 4%, ajustada pela inflação, sobreviveu a quase todos os cenários históricos de 30 anos, com uma carteira de ~50% ações e ~50% títulos.",
          "O número não é garantia: é uma probabilidade baseada em dados históricos, que precisa de ajustes conforme o mercado e o prazo.",
        ],
      },
      {
        titulo: "Como aplicar no Brasil",
        paragrafos: [
          "1) Defina o patrimônio necessário: custo de vida mensal × 300 (para 4%). 2) No primeiro ano, retire 4% do patrimônio total. 3) Nos anos seguintes, corrija o valor pela inflação — não pela variação do patrimônio.",
          "Cuidado com o Brasil: juros altos favorecem a renda fixa, mas a volatilidade do real e a inflação alta pedem diversificação entre renda fixa IPCA+, ações, FIIs e exterior.",
        ],
        lista: [
          {
            titulo: "3% ao ano",
            corpo: "Versão conservadora para quem quer margem extra ou prazos acima de 40 anos.",
          },
          {
            titulo: "4% ao ano",
            corpo: "O padrão de 30 anos estudado pelo Trinity Study.",
          },
          {
            titulo: "Acima de 4%",
            corpo:
              "Só para prazos curtos ou com forte renda variável de proventos — aumenta o risco de exaustão.",
          },
        ],
      },
      {
        titulo: "As falhas a evitar",
        paragrafos: [
          "O maior erro é retirar mais nos anos bons: o padrão deve ser fixo (4% corrigido pela inflação). Outro erro é ignorar a sequência de retornos — começar a retirar logo após uma queda grande do mercado é o cenário mais perigoso; manter 1–2 anos de gastos em caixa ajuda a atravessá-lo.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é a regra dos 4%?",
        a: "É a referência de retirada segura: retire 4% do patrimônio no primeiro ano e corrija pela inflação, com alta probabilidade de a carteira durar 30+ anos.",
      },
      {
        q: "Quanto preciso para viver de renda com 4%?",
        a: "Patrimônio = custo de vida mensal × 300. Para R$ 8.000/mês, cerca de R$ 2,4 milhões.",
      },
      {
        q: "A regra dos 4% funciona no Brasil?",
        a: "Funciona como referência com ajustes: diversifique entre IPCA+, ações, FIIs e exterior, e mantenha 1–2 anos de gastos em caixa para períodos de queda.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "como-viver-de-renda-com-fiis",
    categoria: "FIIs",
    titulo: "Como viver de renda com FIIs? Passo a passo",
    descricao:
      "Como montar uma carteira de FIIs para viver de renda: quanto precisar, dividend yield realista, isenção e estratégia de retirada.",
    h1: "Como viver de renda com FIIs?",
    intro:
      "Fundos imobiliários pagam renda mensal isenta de IR — a estrutura mais próxima de um 'salário de aluguel' negociado na B3. Viver de renda com FIIs é viável, mas exige volume de patrimônio, diversificação e disciplina para não dilapidar o principal.",
    secoes: [
      {
        titulo: "Quanto de FIIs você precisaria",
        paragrafos: [
          "Com dividend yield médio conservador de 8% a.a., cada R$ 100 mil em FIIs pagam ~R$ 8 mil/ano (~R$ 660/mês). Para R$ 5.000/mês de renda, seriam necessários ~R$ 750 mil em FIIs.",
          "Use um yield conservador: o passado mostra FIIs com 9%–11%, mas distribuições não recorrentes e vacância reduzem o número real.",
        ],
        lista: [
          {
            titulo: "Renda de R$ 2.000/mês",
            corpo: "≈ R$ 300 mil em FIIs a 8% a.a.",
          },
          {
            titulo: "Renda de R$ 5.000/mês",
            corpo: "≈ R$ 750 mil em FIIs a 8% a.a.",
          },
          {
            titulo: "Renda de R$ 10.000/mês",
            corpo: "≈ R$ 1,5 milhão em FIIs a 8% a.a.",
          },
        ],
      },
      {
        titulo: "Construindo a carteira",
        paragrafos: [
          "Diversifique entre segmentos (galpões logísticos, lajes, shoppings, papel/híbrido, saúde) e entre gestoras. Prefira fundos com histórico de distribuições estáveis, vacância controlada e prêmio/desconto razoável sobre o valor patrimonial.",
          "Na fase de acúmulo, reinvista 100% das distribuições: é o que acelera a chegada da renda-alvo.",
        ],
      },
      {
        titulo: "A fase de retirada",
        paragrafos: [
          "Quando a renda mensal dos FIIs superar o custo de vida, defina uma regra: retirar o valor do custo de vida e reinvestir o excedente. Mantenha 6–12 meses de gastos em renda fixa líquida para não vender cotas em quedas.",
          "Acompanhe o yield on cost da carteira — a renda real que ela paga sobre o que você investiu — e revise a carteira 1–2 vezes por ano.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto preciso investir em FIIs para viver de renda?",
        a: "Para R$ 5.000/mês com yield de 8% a.a., cerca de R$ 750 mil. Para R$ 2.000/mês, ~R$ 300 mil.",
      },
      {
        q: "FIIs pagam imposto de renda?",
        a: "Distribuições de FIIs são isentas de IR para pessoa física nas regras atuais; a venda das cotas com lucro paga 20% sobre o ganho.",
      },
      {
        q: "É seguro viver só de FIIs?",
        a: "Não é recomendado concentrar tudo: FIIs oscilam e distribuem de forma variável. Combine com renda fixa e ações para diversificar.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "como-viver-de-renda-com-dividendos",
    categoria: "Ações",
    titulo: "Como viver de renda com dividendos?",
    descricao:
      "Estratégia para viver de renda com dividendos: quanto investir, como escolher empresas pagadoras, reinvestir e calcular o yield on cost.",
    h1: "Como viver de renda com dividendos?",
    intro:
      "Viver de dividendos significa construir uma carteira de ações cujos proventos cobrem o custo de vida — sem vender nada. É um caminho mais longo que a renda fixa, mas com potencial de renda real crescente ao longo das décadas.",
    secoes: [
      {
        titulo: "A conta de quanto investir",
        paragrafos: [
          "Divida a renda mensal desejada pelo dividend yield realista da carteira (4%–6% a.a. no Brasil). Para R$ 5.000/mês com 5% a.a., são ~R$ 1,2 milhão; com 6% a.a., ~R$ 1 milhão.",
          "Prefira estimar pelo lucro das empresas: uma empresa que distribui 60% de um lucro consistente tende a manter o dividendo real — mais confiável que um yield alto pontual.",
        ],
      },
      {
        titulo: "Como escolher as pagadoras",
        paragrafos: [
          "Procure: lucro recorrente e histórico de pagamentos de 5+ anos; setores estáveis (bancos, energia, saneamento, consumo); payout sustentável (entre 40% e 80%); e crescimento do provento real ao longo do tempo.",
          "Evite yield acima de ~12% sem explicação: pode ser lucro não recorrente ou queda estrutural de preço.",
        ],
      },
      {
        titulo: "O ciclo de reinvestimento",
        paragrafos: [
          "Nos primeiros anos, reinvista 100% dos proventos — é isso que constrói o yield on cost. O yield on cost (provento anual ÷ preço médio pago) é o número que importa: ele mostra a renda real que a sua carteira construiu, independente do preço atual.",
          "Quando a renda anual passar do custo de vida com folga, comece a retirar o excedente, mantendo o reinvestimento nos anos de alta.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto preciso para viver de dividendos?",
        a: "Com yield de 5% a.a., R$ 1.000 de renda mensal exigem ~R$ 240 mil; R$ 5.000/mês, ~R$ 1,2 milhão.",
      },
      {
        q: "Dividendos são isentos de imposto de renda?",
        a: "Sim, dividendos distribuídos são isentos para pessoa física nas regras atuais; JCP paga 15% na fonte.",
      },
      {
        q: "É melhor reinvestir dividendos ou gastar?",
        a: "Na fase de acúmulo, sempre reinvestir: acelera os juros compostos e o crescimento da renda passiva.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "melhores-ativos-para-renda-passiva",
    categoria: "Planejamento",
    titulo: "Melhores ativos para renda passiva em 2026",
    descricao:
      "Comparativo dos melhores ativos para renda passiva: FIIs, ações de dividendos, Tesouro IPCA+ com juros, CDBs e ETFs — com prós e contras.",
    h1: "Melhores ativos para renda passiva",
    intro:
      "Renda passiva é o dinheiro que os ativos geram sem trabalho — juros, dividendos, aluguéis e proventos. A escolha do ativo depende do seu objetivo: previsibilidade (renda fixa), crescimento de renda (ações) ou fluxo mensal isento (FIIs).",
    secoes: [
      {
        titulo: "As principais opções no Brasil",
        paragrafos: [
          "Tesouro IPCA+ com juros semestrais: paga cupom a cada 6 meses e corrige o principal pela inflação — a renda que não perde poder de compra.",
          "FIIs: distribuem mensalmente, isentos de IR — o 'aluguel' negociado na B3, com risco de vacância e de preço.",
          "Ações de dividendos: renda variável, isenta, com potencial de crescimento do provento e do patrimônio.",
          "CDBs e LCIs: juros periódicos ou no vencimento, com garantia do FGC (CDB) e isenção (LCI/LCA).",
          "ETFs de dividendos e de FIIs: diversificação em um único produto, com o mesmo tratamento fiscal.",
        ],
      },
      {
        titulo: "Como combinar os ativos",
        paragrafos: [
          "Uma carteira de renda passiva equilibrada no Brasil costuma combinar: IPCA+ (proteção do poder de compra), FIIs (fluxo mensal), ações de dividendos (crescimento de renda) e CDB/Tesouro Selic (liquidez e estabilidade).",
          "O peso de cada um depende do prazo: perto da fase de retirada, aumente a previsibilidade; na fase de acúmulo, priorize crescimento com reinvestimento.",
        ],
      },
      {
        titulo: "O que evitar",
        paragrafos: [
          "Yield alto sem histórico, produtos estruturados com custo escondido, concentração em um único ativo ou setor e 'renda' que na prática consome o principal (ex.: retiradas acima de 4% a.a. ou cupom pago sobre capital próprio sem lucro).",
        ],
      },
    ],
    faq: [
      {
        q: "Qual o melhor ativo para renda passiva?",
        a: "Não existe o melhor absoluto: IPCA+ com cupons protege a inflação, FIIs geram fluxo mensal isento, ações de dividendos crescem a renda. A combinação é a resposta.",
      },
      {
        q: "ETFs de dividendos pagam renda?",
        a: "Sim: ETFs brasileiros que replicam índices de dividendos distribuem os proventos recebidos, também isentos para PF.",
      },
      {
        q: "Quanto de renda passiva os FIIs pagam?",
        a: "Em média 8%–11% ao ano em distribuições isentas, mas o valor varia com ocupação e gestão do fundo.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-sao-juros-compostos",
    categoria: "Educação",
    titulo: "O que são juros compostos? Exemplos práticos",
    descricao:
      "O que são juros compostos, como calcular, exemplos com aportes mensais e por que o tempo é o maior aliado do investidor.",
    h1: "O que são juros compostos?",
    intro:
      "Juros compostos são os juros sobre juros: no segundo mês, você ganha juros sobre o valor inicial e sobre os juros do mês anterior. É o mecanismo que transforma aportes modestos em patrimônios grandes — e por isso o tempo é a variável mais importante do investidor.",
    secoes: [
      {
        titulo: "A matemática simples",
        paragrafos: [
          "Fórmula: M = C × (1 + i)^n, onde C é o capital inicial, i a taxa por período e n o número de períodos. Na renda fixa brasileira, o comum é a taxa mensal (ex.: 0,8% a.m. com Selic alta).",
          "Regra do 72: divida 72 pela taxa anual para estimar em quantos anos o patrimônio dobra. A 12% a.a., dobra em ~6 anos; a 6% a.a., em ~12 anos.",
        ],
      },
      {
        titulo: "Exemplo com aportes mensais",
        paragrafos: [
          "Aportando R$ 1.000/mês a 0,8% a.m. (≈10% a.a.): após 10 anos, ~R$ 201 mil (R$ 120 mil só de aportes); após 15 anos, ~R$ 380 mil; após 20 anos, ~R$ 664 mil. A maior parte do resultado vem dos juros — o tempo multiplica o esforço.",
          "Aportes de R$ 2.000/mês no mesmo cenário passam de R$ 1,3 milhão em 20 anos.",
        ],
      },
      {
        titulo: "Como usar a seu favor",
        paragrafos: [
          "Comece cedo, reinvista tudo na fase de acúmulo, aumente os aportes com o crescimento da renda e evite sacar: cada retirada interrompe a curva composta. Use a calculadora de juros compostos do site para simular o seu cenário.",
        ],
      },
    ],
    faq: [
      {
        q: "O que são juros compostos?",
        a: "São os juros sobre juros: o rendimento de cada período se soma ao principal e passa a render nos períodos seguintes.",
      },
      {
        q: "Como calcular juros compostos?",
        a: "M = C × (1 + i)^n. Para aportes mensais, use a calculadora do site: informe valor do aporte, taxa e prazo.",
      },
      {
        q: "Quanto tempo o dinheiro leva para dobrar?",
        a: "Pela regra do 72: divida 72 pela taxa anual. A 12% a.a., cerca de 6 anos; a 6% a.a., cerca de 12 anos.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "como-comecar-a-investir-do-zero",
    categoria: "Educação",
    titulo: "Como começar a investir do zero em 6 passos",
    descricao:
      "Passo a passo para quem quer começar a investir: reserva de emergência, metas, primeiros ativos, automatização de aportes e erros a evitar.",
    h1: "Como começar a investir do zero",
    intro:
      "Começar a investir não exige dinheiro grande nem conhecimento avançado — exige ordem. Reserve de emergência primeiro, metas claras depois, e só então os primeiros ativos. Este guia é o caminho em 6 passos usado pela maioria dos investidores de longo prazo.",
    secoes: [
      {
        titulo: "Os 6 passos",
        paragrafos: [
          "1) Liste as dívidas caras (cartão e cheque especial) e quite-as antes de investir — juros de 14% ao mês destroem qualquer rendimento.",
          "2) Monte a reserva de emergência: 6 meses de custo de vida em Tesouro Selic ou CDB com liquidez diária.",
          "3) Defina metas com prazo (reserva, viagem, aposentadoria) e o valor de cada uma.",
          "4) Escolha os primeiros ativos: renda fixa pós-fixada para começar, adicionando FIIs e ações conforme o conhecimento cresce.",
          "5) Automatize: aporte fixo no dia do salário — a constância vale mais que a taxa.",
          "6) Revise a alocação uma ou duas vezes por ano, sem reagir ao noticiário.",
        ],
      },
      {
        titulo: "Os erros mais comuns",
        paragrafos: [
          "Investir antes de quitar dívidas caras, colocar dinheiro de curto prazo em ativos voláteis, seguir 'dicas' sem entender o ativo, vender na queda e interromper os aportes em crises — o oposto do que a história mostra funcionar.",
        ],
      },
      {
        titulo: "Quanto começar a investir",
        paragrafos: [
          "Comece com o que sobrar — mesmo R$ 100–200/mês. O hábito e o tempo compensam o valor pequeno: R$ 200/mês a ~10% a.a. passam de R$ 150 mil em 20 anos.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto preciso para começar a investir?",
        a: "Qualquer valor: Tesouro Direto aceita aportes a partir de ~R$ 30 e CDBs digitais também têm mínimos baixos. O importante é a regularidade.",
      },
      {
        q: "Por onde começar a investir?",
        a: "Quite dívidas caras, monte a reserva de emergência em Tesouro Selic e depois diversifique em renda fixa, FIIs e ações.",
      },
      {
        q: "Vale investir antes de quitar dívidas?",
        a: "Geralmente não: o cartão de crédito (até ~14% a.m.) e o cheque especial custam muito mais do que qualquer rendimento de investimento.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "dividendos-ou-fiis",
    categoria: "Comparativo",
    titulo: "Dividendos ou FIIs? Qual rende mais?",
    descricao:
      "Comparativo entre ações de dividendos e FIIs para renda passiva: frequência, tributação, risco, potencial de crescimento e qual escolher.",
    h1: "Dividendos ou FIIs: qual é melhor para renda passiva?",
    intro:
      "As duas maiores máquinas de renda passiva da bolsa brasileira: ações de dividendos e fundos imobiliários. Ambas pagam proventos isentos de IR, mas com diferenças importantes de frequência, crescimento e risco. A resposta para a maioria dos investidores é usar as duas.",
    secoes: [
      {
        titulo: "Comparativo lado a lado",
        paragrafos: [
          "Frequência: FIIs pagam quase sempre mensalmente; ações pagam conforme o calendário da empresa (trimestral, semestral ou anual).",
          "Crescimento: boas empresas tendem a aumentar o dividendo ao longo dos anos (yield on cost sobe); FIIs têm distribuições mais estáveis, mas com menor crescimento real.",
          "Risco: ações oscilam mais com o ciclo econômico; FIIs sofrem com vacância e taxas de juros, mas com fluxo mais previsível.",
        ],
        lista: [
          {
            titulo: "FIIs",
            corpo: "Renda mensal isenta, fluxo previsível, menos crescimento de proventos.",
          },
          {
            titulo: "Ações de dividendos",
            corpo: "Renda isenta e variável, potencial de crescimento de provento e de patrimônio.",
          },
          {
            titulo: "Impostos na venda",
            corpo:
              "Ações: 15% sobre o ganho de capital. FIIs: 20% sobre o ganho de capital na venda das cotas.",
          },
        ],
      },
      {
        titulo: "Quando cada um é melhor",
        paragrafos: [
          "Perto da aposentadoria e com necessidade de fluxo mensal: FIIs têm a vantagem da frequência. Em fase de acúmulo e com horizonte longo: ações de dividendos tendem a construir mais renda real ao longo das décadas.",
          "Na dúvida, divida: uma fatia de FIIs para o fluxo mensal e outra de ações de dividendos para o crescimento da renda — com renda fixa de suporte.",
        ],
      },
      {
        titulo: "A régua do yield on cost",
        paragrafos: [
          "O que importa no longo prazo é o yield on cost: o provento anual dividido pelo preço médio que você pagou. Uma carteira comprada em quedas e mantida por décadas frequentemente mostra yield on cost de 10%+ — acima de qualquer CDI médio do período.",
        ],
      },
    ],
    faq: [
      {
        q: "O que rende mais: FIIs ou ações de dividendos?",
        a: "Em distribuição imediata, FIIs costumam pagar mais (8%–11% a.a.); no longo prazo, ações de dividendos tendem a crescer mais a renda com o aumento dos proventos.",
      },
      {
        q: "FIIs e dividendos pagam imposto?",
        a: "Ambos são isentos de IR para pessoa física nas regras atuais. Já o ganho de capital na venda tributa: 20% para FIIs e 15% para ações.",
      },
      {
        q: "Posso investir nos dois ao mesmo tempo?",
        a: "Sim, e é o mais comum: FIIs para fluxo mensal e ações de dividendos para crescimento, com renda fixa como suporte.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-o-cdi",
    categoria: "Renda fixa",
    titulo: "O que é o CDI e como ele afeta seus investimentos?",
    descricao:
      "O que é o CDI, a relação com a Selic, por que CDBs e LCIs usam o CDI como referência e o impacto no rendimento dos seus investimentos.",
    h1: "O que é o CDI?",
    intro:
      "O CDI (Certificado de Depósito Interbancário) é a taxa usada nos empréstimos entre bancos de um dia para o outro. Na prática, ele gira colado na Selic — e serve de referência para a maioria dos investimentos de renda fixa do Brasil, dos CDBs às LCIs.",
    secoes: [
      {
        titulo: "A relação entre CDI e Selic",
        paragrafos: [
          "A Selic é a taxa básica definida pelo Banco Central; o CDI é a taxa praticada entre bancos e costuma ficar entre 99% e 100% da Selic. Por isso, quando o Copom sobe a Selic, o CDI acompanha.",
          "No dia a dia, tratar CDI ≈ Selic é uma boa aproximação para planejamento.",
        ],
      },
      {
        titulo: "Por que '100% do CDI' importa",
        paragrafos: [
          "CDBs, LCIs e LCAs anunciam rendimento em percentual do CDI: um CDB de 110% do CDI paga 10% a mais que a taxa interbancária do período. Comparar percentuais do CDI só faz sentido entre títulos com o mesmo prazo e liquidez.",
          "A maioria dos bancos digitais paga 100%–110% do CDI em CDBs com liquidez diária — o piso saudável do mercado.",
        ],
      },
      {
        titulo: "E quando o CDI está baixo?",
        paragrafos: [
          "Em ciclos de juros baixos, a renda fixa pós-fixada paga pouco — é o momento de priorizar prefixados e IPCA+, e de buscar renda variável (dividendos, FIIs) para o fluxo de caixa.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é o CDI?",
        a: "É a taxa dos empréstimos entre bancos de um dia, que gira colada na Selic e serve de referência para títulos como CDB, LCI e LCA.",
      },
      {
        q: "Qual a diferença entre Selic e CDI?",
        a: "A Selic é a taxa básica definida pelo Banco Central; o CDI é a taxa praticada entre bancos, geralmente entre 99% e 100% da Selic.",
      },
      {
        q: "O que significa 100% do CDI?",
        a: "Significa que o título paga a taxa CDI integral do período — por exemplo, ~12% a.a. se o CDI estiver em 12% a.a.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "quanto-rende-a-poupanca",
    categoria: "Simulação",
    titulo: "Quanto rende a poupança hoje? Simulação",
    descricao:
      "Quanto rende a poupança hoje com as regras atuais (0,5% a.m. ou 80% da Selic), comparativo com CDB e Tesouro e por que ela perde para a inflação.",
    h1: "Quanto rende a poupança hoje?",
    intro:
      "A poupança tem regras que mudam conforme a Selic: com a taxa básica acima de 8,5% a.a., ela rende 0,5% ao mês mais a TR. Com a Selic abaixo disso, rende 80% da Selic. Em quase todos os cenários recentes, ela ficou abaixo da inflação — e bem abaixo da renda fixa simples.",
    secoes: [
      {
        titulo: "As regras atuais",
        paragrafos: [
          "Selic acima de 8,5% a.a.: rendimento = 0,5% ao mês + TR. Na prática, ~6,17% ao ano brutos, isentos de IR.",
          "Selic igual ou abaixo de 8,5% a.a.: rendimento = 80% da Selic.",
          "Por ser isenta de IR e ter liquidez diária, a poupança parece confortável — mas perde para o CDB 100% do CDI no líquido em quase todos os cenários.",
        ],
      },
      {
        titulo: "Comparativo com 10 mil reais",
        paragrafos: [
          `Poupança: ~${brl(50)}/mês (0,5% a.m.). CDB 100% do CDI: ~${brl(100)} brutos/mês, ~${brl(85)} líquidos no longo prazo. Tesouro Selic: ~${brl(100)} brutos/mês.`,
          "A diferença de R$ 35–50/mês por 10 mil parece pequena, mas em 10 anos ela representa dezenas de milhares de reais a mais — sem risco adicional relevante.",
        ],
      },
      {
        titulo: "Quando a poupança ainda faz sentido",
        paragrafos: [
          "Para quem precisa de zero burocracia e valores muito baixos, a poupança funciona como porta de entrada. A partir de ~R$ 1.000, CDB com liquidez diária ou Tesouro Selic já rendem mais com segurança equivalente — e sem custo.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto rende a poupança hoje por mês?",
        a: "Com a Selic acima de 8,5% a.a., 0,5% ao mês + TR: 10 mil reais rendem ~R$ 50/mês. Abaixo de 8,5%, rende 80% da Selic.",
      },
      {
        q: "A poupança rende mais que o Tesouro Selic?",
        a: "Não: o Tesouro Selic acompanha a taxa básica e rende mais que a poupança na maioria dos cenários, com risco praticamente igual.",
      },
      {
        q: "A poupança perde para a inflação?",
        a: "Em períodos de inflação acima de ~6% a.a., sim — o rendimento de 0,5% a.m. não compensa a perda de poder de compra.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "tesouro-direto-ou-cdb",
    categoria: "Comparativo",
    titulo: "Tesouro Direto ou CDB: qual escolher?",
    descricao:
      "Diferenças entre Tesouro Direto e CDB: garantidor, liquidez, tributação, riscos e quando cada um é a melhor escolha.",
    h1: "Tesouro Direto ou CDB: qual é melhor?",
    intro:
      "As duas opções mais usadas da renda fixa brasileira têm rendimentos parecidos e riscos diferentes. O Tesouro é garantido pelo governo federal; o CDB, pelo banco emissor com cobertura do FGC. A escolha depende do valor, do prazo e da sua tolerância.",
    secoes: [
      {
        titulo: "A diferença essencial: quem garante",
        paragrafos: [
          "Tesouro Direto: título do governo federal — o risco de crédito é o menor do país.",
          "CDB: título do banco emissor, protegido pelo FGC até R$ 250 mil por banco e por CPF (somando juros). Acima disso, o risco é do banco.",
        ],
      },
      {
        titulo: "Liquidez e custos",
        paragrafos: [
          "Ambos têm liquidez diária. No Tesouro, a taxa da B3 foi zerada, restando eventuais taxas de corretora; CDBs de bancos digitais costumam não cobrar taxas e pagar 100%–110% do CDI.",
          "Vender antes do vencimento gera marcação a mercado nos dois casos — no Tesouro Selic a oscilação é mínima; em prefixados e IPCA+, pode ser relevante.",
        ],
        lista: [
          {
            titulo: "Valor até R$ 250 mil",
            corpo: "CDB costuma pagar mais (110%+ em bancos menores) com FGC cobrindo o total.",
          },
          {
            titulo: "Valor acima de R$ 250 mil",
            corpo: "Tesouro passa a ser mais seguro para a fatia que excede a cobertura do FGC.",
          },
          {
            titulo: "Meta de longo prazo",
            corpo:
              "Tesouro IPCA+ é a opção mais previsível em termos reais; CDBs longos dependem da taxa oferecida.",
          },
        ],
      },
      {
        titulo: "E a tributação?",
        paragrafos: [
          "Os dois pagam IR regressivo (22,5% a 15%). A diferença prática: CDB de 110% do CDI líquido vs Tesouro Selic 100% — para prazos longos e valores até o FGC, o CDB de boa taxa ganha; para valores grandes, o Tesouro equilibra o risco.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é mais seguro: Tesouro Direto ou CDB?",
        a: "Tesouro Direto: o emissor é o governo federal. CDB é garantido pelo FGC até R$ 250 mil por banco; acima disso, há risco do banco.",
      },
      {
        q: "Qual paga mais: Tesouro Selic ou CDB 110% do CDI?",
        a: "O CDB de 110% do CDI paga 10% a mais que o Tesouro Selic, com cobertura do FGC — para valores até o limite, costuma compensar.",
      },
      {
        q: "CDB tem imposto de renda?",
        a: "Sim: IR regressivo de 22,5% a 15%, igual ao Tesouro Direto.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "em-quantos-anos-vou-viver-de-renda",
    categoria: "Planejamento",
    titulo: "Em quantos anos você pode viver de renda?",
    descricao:
      "Como estimar o prazo para viver de renda: taxa de poupança, rentabilidade, tabelas por perfil e o cálculo da aposentadoria em anos.",
    h1: "Em quantos anos você pode viver de renda?",
    intro:
      "O prazo para viver de renda depende de duas variáveis: a taxa de poupança (quanto você guarda da renda) e a rentabilidade real da carteira. A mais importante delas é a poupança — quem guarda mais, chega antes, mesmo investindo pior.",
    secoes: [
      {
        titulo: "A tabela dos prazos (retorno real de 5% a.a.)",
        paragrafos: [
          "Com retorno real de 5% a.a. e retirada de 4% ao ano, o número de anos aproximado é: poupando 10% da renda → ~50 anos; 20% → ~35 anos; 30% → ~27 anos; 40% → ~22 anos; 50% → ~17 anos; 60% → ~13 anos.",
          "Os números mudam pouco com a rentabilidade: entre 4% e 6% reais a diferença é de poucos anos — entre poupar 20% e 40% da renda, a diferença é de mais de uma década.",
        ],
      },
      {
        titulo: "A conta passo a passo",
        paragrafos: [
          "1) Renda alvo: custo de vida mensal × 300 (ou × 240 usando yield de 5%). 2) Simule quanto você precisa aportar por mês no prazo desejado (use a calculadora de juros compostos). 3) Compare o aporte com a sua renda: se precisar de mais de ~40% dela, estenda o prazo em vez de exigir o impossível.",
        ],
      },
      {
        titulo: "As alavancas que encurtam o prazo",
        paragrafos: [
          "Aumentar a renda (carreira, renda extra), reduzir o custo de vida, reinvestir 100% dos proventos na fase de acúmulo e evitar imprevistos com a reserva de emergência. Cada 1% a mais de taxa de poupança tira meses a anos do plano.",
        ],
      },
    ],
    faq: [
      {
        q: "Quantos anos preciso investir para viver de renda?",
        a: "Depende da taxa de poupança: ~17 anos poupando 50% da renda, ~27 anos poupando 30% e ~35 anos poupando 20% (retorno real de 5% a.a.).",
      },
      {
        q: "Qual a taxa de poupança ideal?",
        a: "Quanto maior, melhor, mas o realista é entre 20% e 40% da renda bruta, com aportes automáticos no dia do salário.",
      },
      {
        q: "A rentabilidade muda muito o prazo?",
        a: "Menos que a taxa de poupança: entre 4% e 6% reais a diferença é de poucos anos; entre 20% e 40% de poupança, a diferença passa de uma década.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-etf",
    categoria: "Educação",
    titulo: "O que é um ETF? Guia para iniciantes",
    descricao:
      "O que é um ETF, como funcionam os fundos de índice negociados em bolsa, os principais ETFs brasileiros e a tributação.",
    h1: "O que é um ETF?",
    intro:
      "ETF (Exchange Traded Fund) é um fundo de investimento negociado em bolsa como uma ação: em uma única compra, você adquire uma cesta de ativos — como as maiores empresas do Ibovespa ou um índice de dividendos — com diversificação automática.",
    secoes: [
      {
        titulo: "Como funciona",
        paragrafos: [
          "O ETF replica um índice: o BOVA11 segue as maiores empresas da B3, o DIVO11 um índice de dividendos, os fundos de FIIs seguem cestas de fundos imobiliários. O valor da cota acompanha o índice do dia.",
          "A vantagem: diversificação com um único produto, custo baixo (taxa de administração pequena) e gestão passiva — sem depender de escolhas de um gestor.",
        ],
        lista: [
          {
            titulo: "BOVA11 / IBOV",
            corpo: "Segue as maiores empresas da bolsa brasileira.",
          },
          {
            titulo: "DIVO11",
            corpo: "Segue um índice de empresas pagadoras de dividendos.",
          },
          {
            titulo: "ETF de FIIs",
            corpo: "Cesta de fundos imobiliários em um único produto.",
          },
          {
            titulo: "IVVB11",
            corpo: "Exposição ao S&P 500, o índice das 500 maiores empresas dos EUA.",
          },
        ],
      },
      {
        titulo: "Tributação e custos",
        paragrafos: [
          "A venda de cotas com lucro paga IR de 15% sobre o ganho, com isenção para vendas de até R$ 20 mil/mês de ETFs de ações no mercado à vista (regras atuais).",
          "Proventos recebidos pelos ETFs brasileiros (como dividendos de BOVA11) são repassados aos cotistas e seguem a isenção de dividendos.",
        ],
      },
      {
        titulo: "Quando usar ETFs",
        paragrafos: [
          "Para quem quer diversificação simples, exposição a outros países (IVVB11) ou uma base de carteira sem escolher ações individuais. ETFs de dividendos e de FIIs são boas opções de renda passiva com menos trabalho de manutenção.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é um ETF?",
        a: "É um fundo negociado em bolsa que replica um índice — você compra uma cota e fica exposto a uma cesta inteira de ativos.",
      },
      {
        q: "ETF paga imposto de renda?",
        a: "Sim: 15% sobre o ganho de capital na venda (com isenção até R$ 20 mil/mês em vendas de ações/ETFs no à vista). Dividendos recebidos são isentos.",
      },
      {
        q: "É melhor ETF ou ações individuais?",
        a: "ETFs diversificam com um produto e custo baixo; ações individuais exigem análise. Para iniciantes, ETFs são o ponto de partida mais simples.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "o-que-e-lci-e-lca",
    categoria: "Renda fixa",
    titulo: "O que são LCI e LCA? Títulos isentos",
    descricao:
      "O que são LCI e LCA, por que são isentos de IR, como funcionam os percentuais do CDI, o prazo mínimo e quando compensam.",
    h1: "O que são LCI e LCA?",
    intro:
      "LCI (Letra de Crédito Imobiliário) e LCA (Letra de Crédito do Agronegócio) são títulos emitidos por bancos para financiar imóveis e o agronegócio — e o grande atrativo é a isenção de imposto de renda para pessoa física.",
    secoes: [
      {
        titulo: "Como funcionam",
        paragrafos: [
          "Assim como o CDB, você empresta dinheiro ao banco emissor. A diferença: os recursos são destinados a crédito imobiliário (LCI) ou ao agronegócio (LCA), e o rendimento — normalmente um percentual do CDI (85% a 97%) — é isento de IR.",
          "Existe um prazo mínimo de carência: 90 dias para LCA e 90 dias para LCI (com regras específicas conforme a emissão) — o dinheiro fica preso nesse período.",
        ],
      },
      {
        titulo: "Quando compensa",
        paragrafos: [
          "Compare o líquido: LCI de 90% do CDI equivale, no prazo longo, a um CDB de cerca de 106% do CDI (considerando IR de 15%). Para prazos curtos, o CDB pode ganhar, pois o IR ainda é alto e a LCI não paga bem.",
          "A garantia do FGC cobre até R$ 250 mil por banco e CPF — confirme o limite somando os valores na mesma instituição.",
        ],
        lista: [
          {
            titulo: "Isenção",
            corpo: "Rendimento sem IR para pessoa física dentro das regras atuais.",
          },
          {
            titulo: "Prazo mínimo",
            corpo:
              "Carência mínima de 90 dias — não usar para dinheiro que pode ser preciso antes.",
          },
          {
            titulo: "Garantia",
            corpo: "FGC até R$ 250 mil por banco e por CPF, incluindo juros.",
          },
        ],
      },
      {
        titulo: "O que observar antes de comprar",
        paragrafos: [
          "Compare o percentual do CDI entre as emissões, o prazo, a liquidez e a solidez do banco. Bancos menores oferecem taxas maiores; exija o FGC e avalie se o adicional compensa o risco e a carência.",
        ],
      },
    ],
    faq: [
      {
        q: "O que é LCI e LCA?",
        a: "Títulos de renda fixa emitidos por bancos para crédito imobiliário (LCI) e agronegócio (LCA), com rendimento isento de IR para pessoa física.",
      },
      {
        q: "LCI e LCA pagam imposto de renda?",
        a: "Não: o rendimento é isento para pessoa física, desde que cumpridos os prazos mínimos da emissão.",
      },
      {
        q: "LCI de 90% do CDI é melhor que CDB de 110%?",
        a: "Depende do prazo: no longo prazo, a isenção faz a LCI de 90% render mais líquido; em prazos curtos, o CDB de 110% pode vencer.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "carteira-de-dividendos-como-montar",
    categoria: "Ações",
    titulo: "Carteira de dividendos: como montar em 5 passos",
    descricao:
      "Como montar uma carteira de dividendos: renda alvo, critérios de escolha, diversificação, reinvestimento e acompanhamento do yield on cost.",
    h1: "Como montar uma carteira de dividendos",
    intro:
      "Uma carteira de dividendos é construída em passos: definir a renda alvo, escolher empresas com lucro consistente, diversificar por setor, reinvestir os proventos e acompanhar o yield on cost. Não existe atalho — existe método.",
    secoes: [
      {
        titulo: "Os 5 passos",
        paragrafos: [
          "1) Defina a renda alvo mensal e calcule o patrimônio necessário (renda × 12 ÷ yield realista de 4%–6%).",
          "2) Escolha empresas com lucro recorrente, histórico de 5+ anos de proventos e payout entre 40% e 80%.",
          "3) Diversifique: no mínimo 10–15 posições em setores diferentes (bancos, energia, saneamento, consumo, mineração).",
          "4) Reinvista 100% dos proventos na fase de acúmulo — é o motor dos juros compostos.",
          "5) Acompanhe o yield on cost mensalmente e rebalanceie 1–2 vezes por ano, direcionando novos aportes às posições atrasadas.",
        ],
      },
      {
        titulo: "O que evitar",
        paragrafos: [
          "Concentrar em poucos tickers, comprar yield alto sem entender o motivo, ignorar dívida das empresas e mudar de estratégia em quedas. A carteira de dividendos é um projeto de décadas — o abandono é o maior inimigo.",
        ],
      },
      {
        titulo: "Como medir o progresso",
        paragrafos: [
          "Acompanhe: patrimônio total, dividendos recebidos no ano, yield on cost e o percentual do custo de vida coberto pelos proventos. Esse último número é o placar real: ele sobe todo mês em que o dividendo entra e o custo de vida fica estável.",
        ],
      },
    ],
    faq: [
      {
        q: "Quantas ações uma carteira de dividendos deve ter?",
        a: "Entre 10 e 20 posições de setores diferentes é o intervalo mais comum — diversificação real sem perder o controle.",
      },
      {
        q: "Qual o melhor yield para escolher ações?",
        a: "Entre 4% e 8% a.a. com histórico consistente. Yields acima de 12% costumam indicar risco — proventos não recorrentes ou queda de preço.",
      },
      {
        q: "Quando começar a usar os dividendos?",
        a: "Quando a renda anual dos proventos superar o custo de vida com folga. Até lá, reinvista tudo.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "reserva-de-emergencia",
    categoria: "Planejamento",
    titulo: "Reserva de emergência: quanto guardar e onde",
    descricao:
      "O que é reserva de emergência, quanto guardar (6 a 12 meses), onde deixar (Tesouro Selic, CDB) e os erros mais comuns.",
    h1: "Reserva de emergência: o primeiro investimento de todos",
    intro:
      "Reserva de emergência é o dinheiro que paga imprevistos sem desmontar os investimentos: demissão, saúde, consertos. Sem ela, qualquer crise obriga a vender ativos no pior momento — o erro mais caro que um investidor pode cometer.",
    secoes: [
      {
        titulo: "Quanto guardar",
        paragrafos: [
          "A referência é 6 meses de custo de vida (despesas essenciais). Quem tem renda variável (autônomos, comissões) deve mirar 9 a 12 meses; quem tem estabilidade (servidores, CLT consolidado) pode usar 3 a 6.",
          "Calcule pelas despesas reais, não pela renda: o que importa é quanto você gasta por mês.",
        ],
      },
      {
        titulo: "Onde deixar",
        paragrafos: [
          "O requisito é liquidez imediata com risco mínimo: Tesouro Selic ou CDB com liquidez diária de 100%+ do CDI são as opções padrão. Evite ativos voláteis (ações, FIIs) e prazos longos — a reserva não é investimento, é seguro.",
          "Separe em uma conta ou carteira à parte, para não misturar com os aportes de longo prazo.",
        ],
        lista: [
          {
            titulo: "Tesouro Selic",
            corpo: "Liquidez diária e oscilação mínima — a opção mais simples.",
          },
          {
            titulo: "CDB 100%+ do CDI",
            corpo: "Liquidez diária com FGC de até R$ 250 mil.",
          },
          {
            titulo: "Conta remunerada",
            corpo: "Útil para valores menores, mas geralmente rende abaixo do CDI.",
          },
        ],
      },
      {
        titulo: "Os erros mais comuns",
        paragrafos: [
          "Usar a reserva para investir em 'oportunidades', deixar em ativos que caem na crise (ações, FIIs), manter o valor fixo sem atualizar pela inflação e confundir reserva com sobra de caixa. Reabasteça sempre que usar.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto devo ter de reserva de emergência?",
        a: "6 meses de despesas essenciais é a referência padrão; 9 a 12 meses para quem tem renda variável.",
      },
      {
        q: "Onde deixar a reserva de emergência?",
        a: "Tesouro Selic ou CDB com liquidez diária de 100% do CDI — liquidez imediata e risco mínimo.",
      },
      {
        q: "Pode investir a reserva de emergência?",
        a: "Não: ela deve ficar em renda fixa líquida. Investi-la em ativos voláteis transforma o seguro em risco.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
  {
    slug: "como-viver-de-renda-em-15-anos",
    categoria: "Planejamento",
    titulo: "Como viver de renda em 15 anos: plano completo",
    descricao:
      "Plano completo para viver de renda em 15 anos: cálculo da meta, taxa de poupança, alocação, reinvestimento e os números mensais necessários.",
    h1: "Como viver de renda em 15 anos",
    intro:
      "Viver de renda em 15 anos é um objetivo agressivo, mas alcançável para quem mantém taxa de poupança alta, reinveste 100% dos proventos e não muda de estratégia nas crises. Este é o plano completo, com os números de cada etapa.",
    secoes: [
      {
        titulo: "O cálculo da meta",
        paragrafos: [
          `Meta = custo de vida mensal × 300 (regra dos 4%). Para R$ 6.000/mês → ${brl(1_800_000)}; para R$ 8.000/mês → ${brl(2_400_000)}; para R$ 12.000/mês → ${brl(3_600_000)}.`,
          "Com retorno real de 5,5% a.a., chegar à meta em 15 anos exige os aportes mensais abaixo — e cada ano adicional reduz o esforço pela metade aproximadamente.",
        ],
        lista: [
          {
            titulo: "Meta R$ 1,8 milhão",
            corpo: "≈ R$ 6.700/mês em 15 anos — ou R$ 3.700/mês em 20 anos.",
          },
          {
            titulo: "Meta R$ 2,4 milhões",
            corpo: "≈ R$ 8.900/mês em 15 anos — ou R$ 4.900/mês em 20 anos.",
          },
          {
            titulo: "Meta R$ 3,6 milhões",
            corpo: "≈ R$ 13.400/mês em 15 anos — ou R$ 7.400/mês em 20 anos.",
          },
        ],
      },
      {
        titulo: "A alocação para 15 anos",
        paragrafos: [
          "Uma estrutura comum: 30%–50% em renda fixa (Tesouro IPCA+ para proteção, Selic/CDB para liquidez), 20%–40% em ações de dividendos, 10%–30% em FIIs e 5%–15% em ETFs internacionais.",
          "Nos primeiros 10 anos, reinvestimento total; nos últimos 5, reduza gradualmente o risco e aproxime a alocação do fluxo de retirada.",
        ],
      },
      {
        titulo: "O que separa quem chega de quem desiste",
        paragrafos: [
          "Automatizar aportes no dia do salário, aumentar o aporte com cada aumento de renda, não vender em quedas (comprar é a regra), registrar o progresso mensalmente e manter a reserva de emergência intacta. O plano de 15 anos é uma maratona: a consistência vale mais que qualquer acerto.",
        ],
      },
    ],
    faq: [
      {
        q: "É possível viver de renda em 15 anos?",
        a: "Sim, para quem mantém aportes altos (30%+ da renda), reinveste tudo e mantém retorno real próximo de 5,5% a.a. — o maior fator é a taxa de poupança.",
      },
      {
        q: "Quanto preciso investir por mês para viver de renda em 15 anos?",
        a: "Para uma meta de R$ 2,4 milhões (renda de ~R$ 8.000/mês), ~R$ 8.900/mês com retorno real de 5,5% a.a. Em 20 anos, cai para ~R$ 4.900/mês.",
      },
      {
        q: "Qual a melhor estratégia para 15 anos?",
        a: "Diversificação entre IPCA+, ações de dividendos, FIIs e exterior, com aportes automáticos, reinvestimento total e revisão anual da alocação.",
      },
    ],
    atualizadoEm: "2026-08-01",
  },
];

/** Slug -> conteúdo, para lookup rápido na rota e no sitemap. */
export const CONTEUDO_POR_SLUG = new Map(CONTEUDOS.map((c) => [c.slug, c]));

/** Caminho público da página de um conteúdo. */
export const caminhoConteudo = (slug: string) => `/conteudo/${slug}`;
