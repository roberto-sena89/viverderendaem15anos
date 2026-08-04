/**
 * Panorama de mercado — agregação da aba "Visão geral" das Cotações.
 *
 * Reúne, em uma única resposta, o resumo executivo de cada aba do terminal
 * (Ações, FIIs, Índices, Tesouro Direto, ETFs, Criptomoedas e Commodities).
 * Todas as fontes já possuem cache compartilhado, então este agregador não
 * multiplica chamadas externas: ele apenas lê e resume o que está em cache.
 */

export type MetricaResumo = { rotulo: string; valor: string; variacao?: number | null };

export type LinhaResumo = {
  ticker: string;
  nome: string;
  valor: string;
  variacao: number | null;
  spark: number[];
  /** Aba do terminal que deve ser aberta ao clicar na linha. */
  destino: string;
  /** Símbolo no provedor de histórico (Yahoo). Null quando não há série. */
  simbolo: string | null;
  /** Métricas já conhecidas da categoria, exibidas no modal de detalhe. */
  detalhes: MetricaResumo[];
};

export type ResumoCategoria = {
  /** Corresponde ao id da aba em ABAS_COTACOES. */
  id: string;
  rotulo: string;
  legenda: string;
  destaque: { rotulo: string; valor: string; variacao: number | null } | null;
  metricas: MetricaResumo[];
  altas: LinhaResumo[];
  baixas: LinhaResumo[];
  /** Proporção de ativos em alta (0–100) quando faz sentido para a categoria. */
  amplitude: { emAlta: number; emBaixa: number; total: number } | null;
  indisponivel: boolean;
};

export type PanoramaMercado = {
  indices: {
    ticker: string;
    nome: string;
    valor: string;
    variacao: number | null;
    spark: number[];
  }[];
  termometro: { emAlta: number; emBaixa: number; total: number; percentual: number };
  categorias: ResumoCategoria[];
  altas: LinhaResumo[];
  baixas: LinhaResumo[];
  atualizadoEm: string;
};

/* ------------------------------ formatação ------------------------------ */

const nf = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function moeda(v: number | null | undefined, cur: "BRL" | "USD" = "BRL") {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const casas = Math.abs(v) < 1 ? 4 : 2;
  return `${cur === "BRL" ? "R$" : "US$"} ${nf(v, casas)}`;
}

function compacto(v: number | null | undefined, prefixo = "US$ ") {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${prefixo}${nf(v / 1e12, 2)} tri`;
  if (abs >= 1e9) return `${prefixo}${nf(v / 1e9, 2)} bi`;
  if (abs >= 1e6) return `${prefixo}${nf(v / 1e6, 2)} mi`;
  return `${prefixo}${nf(v, 0)}`;
}

const pct = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${nf(v, 2)}%`;

function amplitudeDe(vars: (number | null)[]) {
  const validos = vars.filter((v): v is number => v !== null && Number.isFinite(v));
  return {
    emAlta: validos.filter((v) => v > 0).length,
    emBaixa: validos.filter((v) => v < 0).length,
    total: validos.length,
  };
}

function ordenar<T>(itens: T[], valor: (i: T) => number | null) {
  return [...itens]
    .filter((i) => valor(i) !== null && Number.isFinite(valor(i) as number))
    .sort((a, b) => (valor(b) ?? 0) - (valor(a) ?? 0));
}

function vazio(id: string, rotulo: string, legenda: string): ResumoCategoria {
  return {
    id,
    rotulo,
    legenda,
    destaque: null,
    metricas: [],
    altas: [],
    baixas: [],
    amplitude: null,
    indisponivel: true,
  };
}

async function seguro<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/* ------------------------------ agregação ------------------------------- */

export async function buscarPanorama(): Promise<PanoramaMercado> {
  const { gradeComCache } = await import("@/lib/cotacoes-cache.server");
  const { buscarIndices } = await import("@/lib/indices.server");
  const { buscarTesouro } = await import("@/lib/tesouro-grade.server");
  const { buscarCommodities } = await import("@/lib/commodities.server");
  const { gradeCriptoComCache } = await import("@/lib/cripto.server");
  const { gradeEtfsComCache } = await import("@/lib/etfs.server");
  const { INDICES: DEFS_INDICES } = await import("@/lib/indices-base");
  const { COMMODITIES: DEFS_COMMODITIES } = await import("@/lib/commodities-base");
  const simboloIndice = (codigo: string) =>
    DEFS_INDICES.find((d) => d.codigo === codigo)?.simbolos?.[0] ?? null;
  const simboloCommodity = (codigo: string) =>
    DEFS_COMMODITIES.find((d) => d.codigo === codigo)?.simbolos?.[0] ?? null;

  const [indicesGrade, acoes, fiis, cripto, etfs, indices, tesouro, commodities] = await Promise.all([
    seguro(() => gradeComCache("indices")),
    seguro(() => gradeComCache("acoes")),
    seguro(() => gradeComCache("fiis")),
    seguro(() => gradeCriptoComCache()),
    seguro(() => gradeEtfsComCache()),
    seguro(() => buscarIndices()),
    seguro(() => buscarTesouro()),
    seguro(() => buscarCommodities()),
  ]);

  /* --- faixa superior de índices --- */
  const ehIndice = (t: string) => !/USD|BRL|BTC|ETH|EUR/i.test(t);
  const faixaIndices = (indicesGrade?.linhas ?? []).slice(0, 6).map((l) => ({
    ticker: l.ticker,
    nome: l.nome,
    valor:
      l.preco !== null && ehIndice(l.ticker)
        ? `${nf(l.preco, 0)} pts`
        : moeda(l.preco, l.moeda === "USD" ? "USD" : "BRL"),
    variacao: l.variacaoPercent,
    spark: l.spark ?? [],
    destino: "indices",
  }));

  /* --- Ações --- */
  const linhasAcoes = acoes?.linhas ?? [];
  const acoesOrd = ordenar(linhasAcoes, (l) => l.variacaoPercent);
  const mapaB3 =
    (destino: string) =>
    (l: (typeof linhasAcoes)[number]): LinhaResumo => ({
      ticker: l.ticker,
      nome: l.nome,
      valor: moeda(l.preco, l.moeda === "USD" ? "USD" : "BRL"),
      variacao: l.variacaoPercent,
      spark: l.spark ?? [],
      destino,
      simbolo: l.simbolo ?? null,
      detalhes: [
        { rotulo: "Fech. anterior", valor: moeda(l.fechamentoAnterior, l.moeda === "USD" ? "USD" : "BRL") },
        { rotulo: "Mínima do dia", valor: moeda(l.minimo, l.moeda === "USD" ? "USD" : "BRL") },
        { rotulo: "Máxima do dia", valor: moeda(l.maximo, l.moeda === "USD" ? "USD" : "BRL") },
        { rotulo: "Volume", valor: compacto(l.volume) },
        ...l.extra.slice(0, 4),
      ],
    });
  const mapaAcao = mapaB3("acoes");
  const mapaFii = mapaB3("fiis");
  const ampAcoes = amplitudeDe(linhasAcoes.map((l) => l.variacaoPercent));
  const resumoAcoes: ResumoCategoria = linhasAcoes.length
    ? {
        id: "acoes",
        rotulo: "Ações",
        legenda: "Maiores empresas listadas na B3",
        destaque: acoesOrd[0]
          ? {
              rotulo: `Destaque · ${acoesOrd[0].ticker}`,
              valor: moeda(acoesOrd[0].preco, "BRL"),
              variacao: acoesOrd[0].variacaoPercent,
            }
          : null,
        metricas: [
          { rotulo: "Acompanhadas", valor: `${linhasAcoes.length}` },
          { rotulo: "Em alta", valor: `${ampAcoes.emAlta}` },
          { rotulo: "Em baixa", valor: `${ampAcoes.emBaixa}` },
        ],
        altas: acoesOrd.slice(0, 3).map(mapaAcao),
        baixas: acoesOrd.slice(-3).reverse().map(mapaAcao),
        amplitude: ampAcoes,
        indisponivel: false,
      }
    : vazio("acoes", "Ações", "Maiores empresas listadas na B3");

  /* --- FIIs --- */
  const linhasFiis = fiis?.linhas ?? [];
  const fiisOrd = ordenar(linhasFiis, (l) => l.variacaoPercent);
  const ampFiis = amplitudeDe(linhasFiis.map((l) => l.variacaoPercent));
  const resumoFiis: ResumoCategoria = linhasFiis.length
    ? {
        id: "fiis",
        rotulo: "FIIs",
        legenda: "Fundos imobiliários negociados na B3",
        destaque: fiisOrd[0]
          ? {
              rotulo: `Destaque · ${fiisOrd[0].ticker}`,
              valor: moeda(fiisOrd[0].preco, "BRL"),
              variacao: fiisOrd[0].variacaoPercent,
            }
          : null,
        metricas: [
          { rotulo: "Acompanhados", valor: `${linhasFiis.length}` },
          { rotulo: "Em alta", valor: `${ampFiis.emAlta}` },
          { rotulo: "Em baixa", valor: `${ampFiis.emBaixa}` },
        ],
        altas: fiisOrd.slice(0, 3).map(mapaFii),
        baixas: fiisOrd.slice(-3).reverse().map(mapaFii),
        amplitude: ampFiis,
        indisponivel: false,
      }
    : vazio("fiis", "FIIs", "Fundos imobiliários negociados na B3");

  /* --- Índices --- */
  const linhasIndices = indices?.linhas ?? [];
  const bolsas = linhasIndices.filter((l) => l.tipo === "bolsa");
  const taxas = linhasIndices.filter((l) => l.tipo === "taxa");
  const ibov = bolsas.find((l) => l.codigo.toUpperCase().includes("IBOV")) ?? bolsas[0];
  const mapaIndice = (l: (typeof linhasIndices)[number]): LinhaResumo => ({
    ticker: l.codigo,
    nome: l.nome,
    valor:
      l.valor === null
        ? "—"
        : l.unidade === "%"
          ? pct(l.valor)
          : `${nf(l.valor, 0)} pts`,
    variacao: l.variacaoDiaPercent,
    spark: l.spark ?? [],
    destino: "indices",
    simbolo: simboloIndice(l.codigo),
    detalhes: [
      { rotulo: "Variação 12m", valor: pct(l.variacao12m), variacao: l.variacao12m },
      { rotulo: "Fonte", valor: l.fonte },
      ...l.extras.slice(0, 4),
    ],
  });
  const bolsasOrd = ordenar(bolsas, (l) => l.variacaoDiaPercent);
  const ampIndices = amplitudeDe(bolsas.map((l) => l.variacaoDiaPercent));
  const resumoIndices: ResumoCategoria = linhasIndices.length
    ? {
        id: "indices",
        rotulo: "Índices",
        legenda: "Índices de bolsa e taxas de referência",
        destaque: ibov
          ? {
              rotulo: ibov.codigo,
              valor: ibov.valor === null ? "—" : `${nf(ibov.valor, 0)} pts`,
              variacao: ibov.variacaoDiaPercent,
            }
          : null,
        metricas: taxas.slice(0, 3).map((t) => ({
          rotulo: t.codigo,
          valor: t.unidade === "%" ? pct(t.valor) : nf(t.valor ?? 0, 2),
        })),
        altas: bolsasOrd.slice(0, 3).map(mapaIndice),
        baixas: bolsasOrd.slice(-3).reverse().map(mapaIndice),
        amplitude: ampIndices,
        indisponivel: false,
      }
    : vazio("indices", "Índices", "Índices de bolsa e taxas de referência");

  /* --- Tesouro Direto --- */
  const titulos = tesouro?.linhas ?? [];
  const porRentabilidade = ordenar(titulos, (t) => t.rentabilidadeEstimada);
  const resumoTesouro: ResumoCategoria = titulos.length
    ? {
        id: "tesouro",
        rotulo: "Tesouro Direto",
        legenda: "Foto diária das taxas dos títulos públicos",
        destaque: porRentabilidade[0]
          ? {
              rotulo: porRentabilidade[0].nome,
              valor: pct(porRentabilidade[0].rentabilidadeEstimada),
              variacao: null,
            }
          : null,
        metricas: [
          { rotulo: "Selic", valor: pct(tesouro?.selic ?? null) },
          { rotulo: "IPCA 12m", valor: pct(tesouro?.ipca12m ?? null) },
          { rotulo: "Títulos", valor: `${titulos.length}` },
        ],
        altas: porRentabilidade.slice(0, 3).map((t) => ({
          ticker: t.nome,
          nome: `Vence em ${new Date(t.vencimento).toLocaleDateString("pt-BR")}`,
          valor: pct(t.taxaCompra),
          variacao: null,
          spark: t.serie.slice(-24).map((p) => p.preco),
          destino: "tesouro",
          simbolo: null,
          detalhes: [
            { rotulo: "Taxa de compra", valor: pct(t.taxaCompra) },
            { rotulo: "Rentabilidade estimada", valor: pct(t.rentabilidadeEstimada) },
            { rotulo: "Vencimento", valor: new Date(t.vencimento).toLocaleDateString("pt-BR") },
          ],
        })),
        baixas: [],
        amplitude: null,
        indisponivel: false,
      }
    : vazio("tesouro", "Tesouro Direto", "Foto diária das taxas dos títulos públicos");

  /* --- ETFs --- */
  const linhasEtfs = etfs?.linhas ?? [];
  const etfsOrd = ordenar(linhasEtfs, (l) => l.variacaoPercent);
  const ampEtfs = amplitudeDe(linhasEtfs.map((l) => l.variacaoPercent));
  const mapaEtf = (l: (typeof linhasEtfs)[number]): LinhaResumo => ({
    ticker: l.ticker,
    nome: l.nome,
    valor: moeda(l.preco, l.mercado === "internacional" ? "USD" : "BRL"),
    variacao: l.variacaoPercent,
    spark: [],
    destino: "etfs",
    simbolo: l.mercado === "internacional" ? l.ticker : `${l.ticker}.SA`,
    detalhes: [
      { rotulo: "Variação 30d", valor: pct(l.var30d), variacao: l.var30d },
      { rotulo: "Variação 12m", valor: pct(l.var12m), variacao: l.var12m },
      { rotulo: "DY 12m", valor: pct(l.dy12) },
      { rotulo: "Patrimônio", valor: compacto(l.capitalizacao) },
      { rotulo: "Gestora", valor: l.gestora ?? "—" },
      { rotulo: "Mercado", valor: l.mercado === "internacional" ? "Exterior" : "B3" },
    ],
  });
  const resumoEtfs: ResumoCategoria = linhasEtfs.length
    ? {
        id: "etfs",
        rotulo: "ETFs",
        legenda: "Fundos de índice da B3 e do exterior",
        destaque: etfsOrd[0]
          ? {
              rotulo: `Destaque · ${etfsOrd[0].ticker}`,
              valor: moeda(etfsOrd[0].preco, etfsOrd[0].mercado === "internacional" ? "USD" : "BRL"),
              variacao: etfsOrd[0].variacaoPercent,
            }
          : null,
        metricas: [
          { rotulo: "Listados", valor: `${linhasEtfs.length}` },
          { rotulo: "B3", valor: `${linhasEtfs.filter((l) => l.mercado === "nacional").length}` },
          {
            rotulo: "Exterior",
            valor: `${linhasEtfs.filter((l) => l.mercado === "internacional").length}`,
          },
        ],
        altas: etfsOrd.slice(0, 3).map(mapaEtf),
        baixas: etfsOrd.slice(-3).reverse().map(mapaEtf),
        amplitude: ampEtfs,
        indisponivel: false,
      }
    : vazio("etfs", "ETFs", "Fundos de índice da B3 e do exterior");

  /* --- Criptomoedas --- */
  const moedas = cripto?.linhas ?? [];
  const criptoOrd = ordenar(moedas, (l) => l.variacao24h);
  const btc = moedas.find((l) => l.ticker.toUpperCase() === "BTC");
  const ampCripto = amplitudeDe(moedas.map((l) => l.variacao24h));
  const mapaCripto = (l: (typeof moedas)[number]): LinhaResumo => ({
    ticker: l.ticker,
    nome: l.nome,
    valor: moeda(l.precoUsd, "USD"),
    variacao: l.variacao24h,
    spark: l.spark ?? [],
    destino: "cripto",
    simbolo: `${l.ticker.toUpperCase()}-USD`,
    detalhes: [
      { rotulo: "Variação 7d", valor: pct(l.variacao7d), variacao: l.variacao7d },
      { rotulo: "Variação 30d", valor: pct(l.variacao30d), variacao: l.variacao30d },
      { rotulo: "Variação 12m", valor: pct(l.variacao12m), variacao: l.variacao12m },
      { rotulo: "Cap. de mercado", valor: compacto(l.capitalizacao) },
      { rotulo: "Volume 24h", valor: compacto(l.volume24h) },
      { rotulo: "Ranking", valor: l.rank ? `#${l.rank}` : "—" },
    ],
  });
  const resumoCripto: ResumoCategoria = moedas.length
    ? {
        id: "cripto",
        rotulo: "Criptomoedas",
        legenda: "Mercado global 24/7 em dólar",
        destaque: btc
          ? { rotulo: "Bitcoin", valor: moeda(btc.precoUsd, "USD"), variacao: btc.variacao24h }
          : null,
        metricas: [
          { rotulo: "Cap. total", valor: compacto(cripto?.capitalizacaoTotal ?? null) },
          { rotulo: "Dom. BTC", valor: pct(cripto?.dominanciaBtc ?? null) },
          { rotulo: "USD/BRL", valor: moeda(cripto?.usdBrl ?? null, "BRL") },
        ],
        altas: criptoOrd.slice(0, 3).map(mapaCripto),
        baixas: criptoOrd.slice(-3).reverse().map(mapaCripto),
        amplitude: ampCripto,
        indisponivel: false,
      }
    : vazio("cripto", "Criptomoedas", "Mercado global 24/7 em dólar");

  /* --- Commodities --- */
  const comms = commodities?.linhas ?? [];
  const commsOrd = ordenar(comms, (l) => l.variacaoDia);
  const ampComms = amplitudeDe(comms.map((l) => l.variacaoDia));
  const mapaComm = (l: (typeof comms)[number]): LinhaResumo => ({
    ticker: l.codigo,
    nome: `${l.nome} · ${l.unidade}`,
    valor: moeda(l.precoUsd, "USD"),
    variacao: l.variacaoDia,
    spark: l.spark ?? [],
    destino: "commodities",
  });
  const petroleo = comms.find((l) => /brent|petr/i.test(l.nome));
  const ouro = comms.find((l) => /ouro|gold/i.test(l.nome));
  const resumoCommodities: ResumoCategoria = comms.length
    ? {
        id: "commodities",
        rotulo: "Commodities",
        legenda: "Energia, metais e agrícolas em dólar",
        destaque: ouro
          ? { rotulo: ouro.nome, valor: moeda(ouro.precoUsd, "USD"), variacao: ouro.variacaoDia }
          : null,
        metricas: [
          ...(petroleo
            ? [{ rotulo: petroleo.nome, valor: moeda(petroleo.precoUsd, "USD") }]
            : []),
          { rotulo: "USD/BRL", valor: moeda(commodities?.usdBrl ?? null, "BRL") },
          { rotulo: "Acompanhadas", valor: `${comms.length}` },
        ],
        altas: commsOrd.slice(0, 3).map(mapaComm),
        baixas: commsOrd.slice(-3).reverse().map(mapaComm),
        amplitude: ampComms,
        indisponivel: false,
      }
    : vazio("commodities", "Commodities", "Energia, metais e agrícolas em dólar");

  /* --- termômetro global (B3 + cripto) --- */
  const variacoesGlobais = [
    ...linhasAcoes.map((l) => l.variacaoPercent),
    ...linhasFiis.map((l) => l.variacaoPercent),
    ...moedas.map((l) => l.variacao24h),
  ];
  const amp = amplitudeDe(variacoesGlobais);
  const termometro = {
    ...amp,
    percentual: amp.total > 0 ? Math.round((amp.emAlta / amp.total) * 100) : 0,
  };

  /* --- destaques do dia (B3 + cripto) --- */
  const universo: LinhaResumo[] = [
    ...linhasAcoes.map(mapaAcao),
    ...linhasFiis.map(mapaFii),
    ...moedas.map(mapaCripto),
  ].filter((l) => l.variacao !== null);
  const universoOrd = [...universo].sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0));

  return {
    indices: faixaIndices,
    termometro,
    categorias: [
      resumoIndices,
      resumoAcoes,
      resumoFiis,
      resumoEtfs,
      resumoTesouro,
      resumoCripto,
      resumoCommodities,
    ],
    altas: universoOrd.slice(0, 6),
    baixas: universoOrd.slice(-6).reverse(),
    atualizadoEm: new Date().toISOString(),
  };
}
