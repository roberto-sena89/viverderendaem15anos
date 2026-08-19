import { describe, expect, it } from "vitest";
import {
  isNovaOportunidade,
  montarCandidatos,
  parseRespostaObservador,
  type OportunidadeObservador,
} from "../../lib/observador-mercado-base";
import type { PosicaoHistorica } from "../../lib/radar.server";

const posicao = (percentil: number, drawdown = -20): PosicaoHistorica => ({
  ticker: "X",
  minimo: 1,
  maximo: 10,
  primeiro: 1,
  ultimo: percentil / 10 + 1,
  percentil,
  inicioSerie: "2020-01-01",
  minimo52s: 1,
  maximo52s: 9,
  distMinima52sPct: 5,
  drawdownMaximoPct: drawdown,
  volatilidadeAnualPct: 25,
  percentilDistribucional: percentil,
  atualizadoEm: new Date().toISOString(),
});

const linha = (ticker: string, dy12: number | null, pvp: number | null, categoria = "acao") => ({
  ticker,
  nome: `Nome ${ticker}`,
  categoria: categoria as "acao" | "fii",
  setor: "Financeiro",
  preco: 10,
  variacaoDia: 0.5,
  dy12,
  pvp,
});

describe("montarCandidatos", () => {
  it("inclui apenas ativos com posição (score não-nulo) e ordena pelo score", () => {
    const candidatos = montarCandidatos(
      [
        linha("ABEV3", 6, 1),
        linha("PETR4", 8, 1),
        linha("HGLG11", 10, 1, "fii"),
        linha("SEMPOS", 8, 1),
      ],
      {
        ABEV3: posicao(20),
        PETR4: posicao(60),
        HGLG11: posicao(10, -35),
      },
      {},
      10,
    );
    expect(candidatos.map((c) => c.ticker)).toEqual(["HGLG11", "ABEV3", "PETR4"]);
    expect(candidatos.every((c) => c.score !== null)).toBe(true);
  });

  it("respeita o limite `top`", () => {
    const linhas = Array.from({ length: 6 }, (_, i) => linha(`ABC${i}`, 5, 1));
    const posicoes = Object.fromEntries(linhas.map((l, i) => [l.ticker, posicao(i * 10)]));
    const candidatos = montarCandidatos(linhas, posicoes, {}, 3);
    expect(candidatos).toHaveLength(3);
  });

  it("notícia de impacto reduz o score (desconto)", () => {
    const [sem, com] = montarCandidatos(
      [linha("ABEV3", 6, 1), linha("PETR4", 6, 1)],
      { ABEV3: posicao(20), PETR4: posicao(20) },
      { PETR4: ["Notícia urgente"] },
      2,
    );
    expect(sem.score).toBeGreaterThan(com.score ?? 0);
  });
});

describe("parseRespostaObservador", () => {
  it("extrai JSON mesmo com markdown ao redor e normaliza campos", () => {
    const texto = `Claro!\n\n\`\`\`json\n{"resumo":"Mercado barato com risco macro.","oportunidades":[{"ticker":"petr4","veredito":"comprar","conviccao":"alta","motivo":"DY alto e percentil baixo","gatilho":"Selic caindo"}],"alertas":["Queda brusca do petróleo"]}\n\`\`\``;
    const r = parseRespostaObservador(texto);
    expect(r.resumo).toBe("Mercado barato com risco macro.");
    expect(r.oportunidades).toHaveLength(1);
    expect(r.oportunidades[0].ticker).toBe("PETR4");
    expect(r.oportunidades[0].veredito).toBe("comprar");
    expect(r.alertas).toEqual(["Queda brusca do petróleo"]);
  });

  it("normaliza veredito/conviccao inválidos e corta oportunidades demais", () => {
    const muitas = Array.from({ length: 20 }, (_, i) => ({
      ticker: `X${i}`,
      veredito: "vender",
      conviccao: "media",
      motivo: "m",
      gatilho: "g",
    }));
    const r = parseRespostaObservador(
      JSON.stringify({
        resumo: "r",
        oportunidades: [{ ticker: "Z", veredito: "talvez", conviccao: "forte", motivo: "m" }, ...muitas],
        alertas: "não é array",
      }),
    );
    expect(r.oportunidades).toHaveLength(12);
    expect(r.oportunidades[0].veredito).toBe("observar");
    expect(r.oportunidades[0].conviccao).toBe("media");
    expect(r.alertas).toEqual([]);
  });

  it("texto sem JSON retorna vazio sem lançar", () => {
    expect(parseRespostaObservador("Não consegui gerar a resposta")).toEqual({
      resumo: "",
      oportunidades: [],
      alertas: [],
    });
  });
});

describe("isNovaOportunidade", () => {
  const op = (ticker: string, veredito: OportunidadeObservador["veredito"]): OportunidadeObservador => ({
    ticker,
    nome: ticker,
    categoria: "acao",
    veredito,
    conviccao: "media",
    motivo: "m",
    gatilho: "g",
  });

  it("marca tickers novos e vereditos que mudaram", () => {
    const anterior = [op("ABEV3", "comprar"), op("PETR4", "observar")];
    const atual = [op("ABEV3", "comprar"), op("PETR4", "comprar"), op("VALE3", "comprar")];
    const novas = isNovaOportunidade(atual, anterior);
    expect(novas.has("PETR4")).toBe(true);
    expect(novas.has("VALE3")).toBe(true);
    expect(novas.has("ABEV3")).toBe(false);
  });
});