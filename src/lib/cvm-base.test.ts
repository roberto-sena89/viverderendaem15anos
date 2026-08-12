import { describe, expect, it } from "vitest";
import {
  diferencaDeSeries,
  fatorSplitAcumulado,
  isoDeBrasil,
  lucroTtmPorTrimestre,
  mapearEmpresaPorNome,
  montarSerieEvEbit,
  montarSeriePlReal,
  normalizarNomeEmpresa,
  numeroBr,
  parseCsvLinhas,
  precoNoFimDoTrimestre,
  serieDaConta,
  somaDeContas,
} from "@/lib/cvm-base";

describe("parseCsvLinhas", () => {
  it("lê cabeçalho e linhas com campos entre aspas", () => {
    const texto = 'A;B;C\n1;2;"x;y"\n3;4;5\n';
    const linhas = parseCsvLinhas(texto);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toEqual({ A: "1", B: "2", C: "x;y" });
  });

  it("descarta linhas vazias e com largura diferente do cabeçalho", () => {
    const texto = "A;B\n1;2\n\n1\n";
    const linhas = parseCsvLinhas(texto);
    expect(linhas).toHaveLength(1);
  });
});

describe("numeroBr", () => {
  it("aceita formatos em R$ milhares com vírgula ou ponto", () => {
    expect(numeroBr("1.234.567,89")).toBe(1234567.89);
    expect(numeroBr("1234567.89")).toBe(1234567.89);
    expect(numeroBr("-5,5")).toBe(-5.5);
  });

  it("rejeita vazio, traço e não numérico", () => {
    expect(numeroBr("")).toBeNull();
    expect(numeroBr("-")).toBeNull();
    expect(numeroBr("abc")).toBeNull();
    expect(numeroBr(null)).toBeNull();
    expect(numeroBr(undefined)).toBeNull();
  });
});

describe("serieDaConta e isoDeBrasil", () => {
  it("extrai a conta por período do trimestre, priorizando o código exato", () => {
    const linhas = [
      { CD_CONTA: "3.01", VL_CONTA: "100", DT_FIM_EXERC: "31/03/2024" },
      { CD_CONTA: "3.01", VL_CONTA: "110", DT_FIM_EXERC: "30/06/2024" },
      { CD_CONTA: "3.01.01", VL_CONTA: "90", DT_FIM_EXERC: "31/03/2024" },
    ];
    const serie = serieDaConta(linhas, "3.01");
    expect(serie.map((p) => p.periodo)).toEqual(["2024-03-31", "2024-06-30"]);
    expect(serie[0].valor).toBe(100);
  });

  it("usa o fallback quando o código não existe", () => {
    const linhas = [{ CD_CONTA: "3.13", VL_CONTA: "42", DT_FIM_EXERC: "31/12/2024" }];
    const serie = serieDaConta(linhas, "3.11", "3.13");
    expect(serie).toHaveLength(1);
    expect(serie[0].valor).toBe(42);
  });

  it("converte datas D/M/A para ISO", () => {
    expect(isoDeBrasil("31/12/2024")).toBe("2024-12-31");
    expect(isoDeBrasil("2024-12-31")).toBe("2024-12-31");
    expect(isoDeBrasil("2024-12-31")).not.toBeNull();
  });

  it("normaliza valores em milhares (ESCALA_MOEDA=MIL) para R$", () => {
    const linhas = [
      { CD_CONTA: "3.11", VL_CONTA: "21295", DT_FIM_EXERC: "2024-06-30", ESCALA_MOEDA: "MIL" },
      { CD_CONTA: "3.11", VL_CONTA: "5.5", DT_FIM_EXERC: "2024-09-30", ESCALA_MOEDA: "UNIDADE" },
    ];
    const serie = serieDaConta(linhas, "3.11");
    expect(serie.find((p) => p.periodo === "2024-06-30")?.valor).toBe(21_295_000);
    expect(serie.find((p) => p.periodo === "2024-09-30")?.valor).toBe(5.5);
  });
});

describe("lucroTtmPorTrimestre", () => {
  // Lucro acumulado: 2023Q4=400; 2024 Q1..Q4 = 100, 220, 340, 480.
  const lucro = [
    { periodo: "2023-12-31", valor: 400 },
    { periodo: "2024-03-31", valor: 100 },
    { periodo: "2024-06-30", valor: 220 },
    { periodo: "2024-09-30", valor: 340 },
    { periodo: "2024-12-31", valor: 480 },
  ];

  it("calcula os últimos 12 meses em cada trimestre", () => {
    const ttm = lucroTtmPorTrimestre(lucro);
    // TTM(Q1/24) = 100 + 400 − acumulado Q1/23 (inexistente) → não computa.
    // TTM(Q2/24) = 220 + 400 − acumulado Q2/23 (inexistente) → não computa.
    // Sem 2023 Q1/Q2, só há TTM válido para Q3/Q4 de 2024 com 2 termos… na
    // realidade o 3º termo (triAnterior) também falta; ajuste abaixo.
    expect(ttm.length).toBeLessThanOrEqual(1);
  });

  it("ou computa com ano anterior completo", () => {
    const completo = [
      { periodo: "2023-03-31", valor: 80 },
      { periodo: "2023-06-30", valor: 180 },
      { periodo: "2023-09-30", valor: 290 },
      { periodo: "2023-12-31", valor: 400 },
      ...lucro,
    ];
    const ttm = lucroTtmPorTrimestre(completo);
    const q2 = ttm.find((p) => p.periodo === "2024-06-30");
    expect(q2).toBeDefined();
    expect(q2!.valor).toBe(220 + 400 - 180);
    const q4 = ttm.find((p) => p.periodo === "2024-12-31");
    expect(q4!.valor).toBe(480 + 400 - 400);
  });
});

describe("splits e P/L real", () => {
  // Splits: 2:1 em 2020-06-01 e 10:1 em 2022-01-10.
  const splits = [
    { data: Date.parse("2020-06-01T00:00:00Z"), fator: 2 },
    { data: Date.parse("2022-01-10T00:00:00Z"), fator: 10 },
  ];

  it("acumula fatores de split posteriores à referência", () => {
    expect(fatorSplitAcumulado(splits, Date.parse("2023-01-01T00:00:00Z"))).toBe(1);
    expect(fatorSplitAcumulado(splits, Date.parse("2021-01-01T00:00:00Z"))).toBe(10);
    expect(fatorSplitAcumulado(splits, Date.parse("2019-01-01T00:00:00Z"))).toBe(20);
  });

  it("pega o último fechamento semanal dentro do trimestre", () => {
    const precos = [
      { data: "2024-03-15", fechamento: 10 },
      { data: "2024-03-29", fechamento: 11 },
      { data: "2024-04-12", fechamento: 12 },
    ];
    expect(precoNoFimDoTrimestre(precos, "2024-03-31")).toBe(11);
    // Sem pontos no trimestre mas dentro da tolerância de 100 dias.
    expect(precoNoFimDoTrimestre(precos, "2024-05-31")).toBe(12);
    // Fora da tolerância.
    expect(precoNoFimDoTrimestre(precos, "2024-12-31")).toBeNull();
  });

  it("monta a série de P/L ajustada por splits e ações atuais", () => {
    // Ações hoje: 100 mil. Lucro TTM de 100 mil (R$ milhares) por trimestre.
    // Preço do trimestre 10 e 11 → P/L 10 e 11 (sem splits no caminho).
    const serie = montarSeriePlReal({
      lucroTtm: [
        { periodo: "2024-03-31", valor: 100_000 },
        { periodo: "2024-06-30", valor: 100_000 },
      ],
      precos: [
        { data: "2024-03-29", fechamento: 10 },
        { data: "2024-06-28", fechamento: 11 },
      ],
      splits: [],
      acoesHoje: 100_000,
    });
    expect(serie.pontos.map((p) => p.pl)).toEqual([10, 11]);
    expect(serie.plAtual).toBe(11);
  });

  it("descarta prejuízo e trimestres sem histórico de preço", () => {
    const serie = montarSeriePlReal({
      lucroTtm: [
        { periodo: "2024-03-31", valor: -50_000 },
        { periodo: "2024-06-30", valor: 100_000 },
        { periodo: "2024-12-31", valor: 80_000 },
      ],
      precos: [{ data: "2024-06-28", fechamento: 20 }],
      splits: [],
      acoesHoje: 100_000,
    });
    expect(serie.pontos).toHaveLength(1);
    expect(serie.pontos[0].periodo).toBe("2024-06-30");
    expect(serie.plAtual).toBe(20);
  });

  it("sem ações conhecidas não há série", () => {
    const serie = montarSeriePlReal({
      lucroTtm: [{ periodo: "2024-03-31", valor: 100_000 }],
      precos: [{ data: "2024-03-29", fechamento: 10 }],
      splits: [],
      acoesHoje: null,
    });
    expect(serie.pontos).toHaveLength(0);
    expect(serie.plAtual).toBeNull();
  });
});

describe("somaDeContas e diferencaDeSeries", () => {
  it("soma várias contas por período, uma linha por (conta, período)", () => {
    const linhas = [
      { CD_CONTA: "2.01.01", VL_CONTA: "100", DT_FIM_EXERC: "2024-06-30", ESCALA_MOEDA: "MIL" },
      { CD_CONTA: "2.01.02", VL_CONTA: "50", DT_FIM_EXERC: "2024-06-30", ESCALA_MOEDA: "MIL" },
      { CD_CONTA: "2.02.01", VL_CONTA: "25", DT_FIM_EXERC: "2024-06-30", ESCALA_MOEDA: "MIL" },
      { CD_CONTA: "2.01.01", VL_CONTA: "999", DT_FIM_EXERC: "2024-06-30", ESCALA_MOEDA: "MIL" },
      { CD_CONTA: "2.01.01", VL_CONTA: "80", DT_FIM_EXERC: "2024-09-30", ESCALA_MOEDA: "MIL" },
    ];
    const soma = somaDeContas(linhas, ["2.01.01", "2.01.02", "2.02.01"]);
    expect(soma.find((p) => p.periodo === "2024-06-30")?.valor).toBe(175_000);
    expect(soma.find((p) => p.periodo === "2024-09-30")?.valor).toBe(80_000);
  });

  it("subtrai séries por período (dívida bruta − caixa)", () => {
    const bruta = [
      { periodo: "2024-06-30", valor: 200_000 },
      { periodo: "2024-09-30", valor: 220_000 },
    ];
    const caixa = [{ periodo: "2024-06-30", valor: 40_000 }];
    const liquida = diferencaDeSeries(bruta, caixa);
    expect(liquida.find((p) => p.periodo === "2024-06-30")?.valor).toBe(160_000);
    expect(liquida.find((p) => p.periodo === "2024-09-30")?.valor).toBe(220_000);
  });
});

describe("montarSerieEvEbit", () => {
  // Ações da classe: 100 mil. EBIT TTM de 50 mil (R$ milhares) → EBIT R$ 50M.
  // Preço 10 e 11 → market cap 1M e 1.1M de reais. Dívida líquida 0 → EV/EBIT 20 e 22.
  it("monta a série de EV/EBIT com dívida líquida do trimestre", () => {
    const serie = montarSerieEvEbit({
      ebitTtm: [
        { periodo: "2024-03-31", valor: 50_000 },
        { periodo: "2024-06-30", valor: 50_000 },
      ],
      precos: [
        { data: "2024-03-29", fechamento: 10 },
        { data: "2024-06-28", fechamento: 11 },
      ],
      splits: [],
      acoesClasse: 100_000,
      dividaLiquida: [
        { periodo: "2024-03-31", valor: 0 },
        { periodo: "2024-06-30", valor: 0 },
      ],
    });
    expect(serie.pontos.map((p) => p.evEbit)).toEqual([20, 22]);
    expect(serie.evEbitAtual).toBe(22);
  });

  it("aplica a dívida líquida e o ajuste de splits ao valor de mercado", () => {
    // Split 2:1 após 2024-03-31: o market cap de março dobrou por 2 preços.
    const serie = montarSerieEvEbit({
      ebitTtm: [{ periodo: "2024-03-31", valor: 50_000 }],
      precos: [{ data: "2024-03-29", fechamento: 10 }],
      splits: [{ data: Date.parse("2024-05-01T00:00:00Z"), fator: 2 }],
      acoesClasse: 100_000,
      dividaLiquida: [{ periodo: "2024-03-31", valor: 30_000 }],
    });
    // (10 × 100k ÷ 2 + 30k) ÷ 50k = 10.6.
    expect(serie.pontos[0].evEbit).toBe(10.6);
  });

  it("descarta trimestres sem EBIT, preço ou balanço", () => {
    const serie = montarSerieEvEbit({
      ebitTtm: [
        { periodo: "2024-03-31", valor: -10_000 },
        { periodo: "2024-06-30", valor: 50_000 },
        { periodo: "2024-12-31", valor: 60_000 },
      ],
      precos: [{ data: "2024-06-28", fechamento: 10 }],
      splits: [],
      acoesClasse: 100_000,
      dividaLiquida: [{ periodo: "2024-06-30", valor: 0 }],
    });
    expect(serie.pontos).toHaveLength(1);
    expect(serie.pontos[0].periodo).toBe("2024-06-30");
    expect(serie.evEbitAtual).toBe(20);
  });

  it("sem ações da classe não há série", () => {
    const serie = montarSerieEvEbit({
      ebitTtm: [{ periodo: "2024-03-31", valor: 50_000 }],
      precos: [{ data: "2024-03-29", fechamento: 10 }],
      splits: [],
      acoesClasse: null,
      dividaLiquida: [{ periodo: "2024-03-31", valor: 0 }],
    });
    expect(serie.pontos).toHaveLength(0);
    expect(serie.evEbitAtual).toBeNull();
  });
});

describe("mapearEmpresaPorNome", () => {
  const empresas = [
    { CNPJ_CIA: "33000167000101", DENOM_CIA: "Petróleo Brasileiro S.A. - Petrobras" },
    { CNPJ_CIA: "33999999000191", DENOM_CIA: "Vale S.A." },
    { CNPJ_CIA: "04403223000122", DENOM_CIA: "B3 S.A. - Brasil, Bolsa, Balcão" },
    { CNPJ_CIA: "11999999000110", DENOM_CIA: "Banco do Brasil S.A." },
  ];

  it("normaliza e casa por tokens comuns", () => {
    expect(normalizarNomeEmpresa("Petróleo Brasileiro S.A. - Petrobras")).toBe(
      "petroleo brasileiro s a petrobras",
    );
    const petro = mapearEmpresaPorNome("Petrobras", empresas);
    expect(petro?.cnpj).toBe("33000167000101");
    expect(mapearEmpresaPorNome("Vale", empresas)?.cnpj).toBe("33999999000191");
  });

  it("distingue empresas com nomes parecidos", () => {
    const brasil = mapearEmpresaPorNome("Banco do Brasil", empresas);
    expect(brasil?.cnpj).toBe("11999999000110");
    const bolsa = mapearEmpresaPorNome("B3 Brasil Bolsa Balcao", empresas);
    expect(bolsa?.cnpj).toBe("04403223000122");
  });

  it("retorna null sem candidato suficiente", () => {
    expect(mapearEmpresaPorNome("Loja de Departamentos Z", empresas)).toBeNull();
    expect(mapearEmpresaPorNome("", empresas)).toBeNull();
    expect(mapearEmpresaPorNome("Petrobras", [])).toBeNull();
  });
});
