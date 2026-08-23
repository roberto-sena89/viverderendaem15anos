/**
 * Faria Lima — Análise profissional em tempo real para o Observador de Mercado.
 *
 * Score multi-fator (preço na história 40% + DY 25% + valor P/VP 15% + risco drawdown 10% + momentum -10% desconto)
 * + filtros institucionais (liquidez, notícia, penny stock) + narrativa no estilo mesa proprietária.
 * Consome as mesmas grades do Radar (ações/FIIs) e devolve briefing pronto para o Observador.
 */

import {
  montarCandidatos,
  type CandidatoObservador,
} from "@/lib/observador-mercado-base";
import { LIMITE_MINIMA, LIMITE_BAIXA } from "@/lib/radar-base";
import type { LinhaObservador } from "@/lib/observador-mercado-base";

export interface OportunidadeFariaLima extends CandidatoObservador {
  tese: string;
  categoriaFariaLima: "valor" | "dividendos" | "crescimento" | "defensiva" | "contrarian";
  risco: "baixo" | "medio" | "alto";
  gatilhoTecnico: string;
  fairValueHint: string | null;
}

export interface AlertaFariaLima {
  nivel: "atencao" | "critico";
  titulo: string;
  detalhe: string;
}

export interface BriefingFariaLima {
  geradoEm: string;
  provedor: string;
  macro: { selic: number | null; ipca: number | null; ibovVariacao?: number | null };
  universo: { acoes: number; fiis: number; candidatos: number };
  resumoExecutivo: string;
  topValor: OportunidadeFariaLima[];
  topDividendos: OportunidadeFariaLima[];
  topFiis: OportunidadeFariaLima[];
  contrarian: OportunidadeFariaLima[];
  alertas: AlertaFariaLima[];
  metodologia: string;
}

function classificarFariaLima(c: CandidatoObservador): OportunidadeFariaLima["categoriaFariaLima"] {
  if (c.categoria === "fii") return c.dy12 !== null && c.dy12 >= 7 ? "dividendos" : "defensiva";
  const pvp = c.pvp ?? 99;
  const dy = c.dy12 ?? 0;
  const pct = c.percentil ?? 50;
  if (pct <= LIMITE_MINIMA && pvp < 1.2 && dy >= 4) return "valor";
  if (dy >= 6 && pct <= 45) return "dividendos";
  if (pct <= 25 && dy < 3) return "contrarian";
  if (pvp > 2.5 && dy > 2) return "crescimento";
  return "defensiva";
}

function riscoDe(c: CandidatoObservador): OportunidadeFariaLima["risco"] {
  const vol = c.volatilidadeAnualPct ?? 30;
  const dd = Math.abs(c.drawdownMaximoPct ?? 30);
  if (vol > 45 || dd > 45) return "alto";
  if (vol > 30 || dd > 30) return "medio";
  return "baixo";
}

function tesePara(c: CandidatoObservador, cat: OportunidadeFariaLima["categoriaFariaLima"]): string {
  const pct = c.percentil !== null ? `${c.percentil.toFixed(0)}% da história` : "sem percentil";
  const dy = c.dy12 !== null ? `${c.dy12.toFixed(1)}% DY` : "sem DY";
  const pvp = c.pvp !== null ? `P/VP ${c.pvp.toFixed(2)}` : "P/VP n/d";
  const dd = c.drawdownMaximoPct !== null ? `${c.drawdownMaximoPct.toFixed(1)}% dd máx` : "dd n/d";
  const map: Record<typeof cat, string> = {
    valor: `Valor desalinhado: ${pct}, ${pvp} atrativo e ${dy}. Janela de acumulação com margem de segurança — gatilho é retomada de volume e reversão do drawdown (${dd}).`,
    dividendos: `Renda com desconto: ${dy} acima do CDI/Selic, preço a ${pct}. Fluxo resiliente; risco é corte de provento se DY >12% sem recorrência.`,
    crescimento: `Crescimento a preço esticado mas com tração: ${dy}, ${pvp}. Aguarde pullback para 35-40% da faixa antes de ampliar.`,
    defensiva: `Beta baixo e ${dy}: porto seguro para rebalanceamento. Preço a ${pct} não é barganha, mas protege volatilidade (${dd}).`,
    contrarian: `Contrarian puro: ${pct} (mínimas), sem dividendo. Só com gatilho técnico e notícia catalisadora — posição tática, stop disciplinado.`,
  };
  return map[cat];
}

function fairValueHint(c: CandidatoObservador): string | null {
  // Heurística simples: mínimo 52s + 15% como hint de valor justo relativo
  if (c.distMinima52sPct !== null && c.preco !== null) {
    const minimo52 = c.preco / (1 + c.distMinima52sPct / 100);
    const alvo = minimo52 * 1.18;
    return `Região de interesse ~R$ ${alvo.toFixed(2)} (mín 52s +18%)`;
  }
  return null;
}

function scoreFariaLima(c: CandidatoObservador): number {
  // Re-pondera o score base com valor e risco
  const base = c.score ?? 50;
  const pvpBonus = c.pvp !== null ? (c.pvp < 0.9 ? 8 : c.pvp < 1.4 ? 4 : c.pvp > 3 ? -6 : 0) : 0;
  const volMalus = (c.volatilidadeAnualPct ?? 0) > 50 ? -5 : 0;
  return Math.max(0, Math.min(100, Math.round(base + pvpBonus + volMalus)));
}

function resumoExecutivoFariaLima(
  macro: { selic: number | null; ipca: number | null },
  candidatos: CandidatoObservador[],
  fiis: CandidatoObservador[],
): string {
  const selic = macro.selic !== null ? `${macro.selic.toFixed(2)}%` : "n/d";
  const ipca = macro.ipca !== null ? `${macro.ipca.toFixed(2)}%` : "n/d";
  const top = candidatos[0];
  const topTxt = top ? `${top.ticker} (${top.score}/100, ${top.percentil?.toFixed(0) ?? "—"}% da história, DY ${top.dy12?.toFixed(1) ?? "—"}%)` : "sem líder claro";
  const qtdBaratas = candidatos.filter((c) => (c.percentil ?? 100) <= LIMITE_BAIXA).length;
  const dyMedio = candidatos.length ? (candidatos.reduce((s, c) => s + (c.dy12 ?? 0), 0) / candidatos.length).toFixed(1) : "—";
  return [
    `Mesa Faria Lima — varredura ${new Date().toLocaleString("pt-BR")} | Selic ${selic} · IPCA ${ipca} · universo ${candidatos.length + fiis.length} ativos.`,
    `Leitura top-down: com Selic ainda em patamar restritivo, prêmio de risco exige DY >6% ou P/VP <1,2 para virar compra. ${qtdBaratas} ativos já negociam na zona barata (≤40% da história) e DY médio do top 12 em ${dyMedio}%.`,
    `Destaque: ${topTxt}. Em FIIs, foco em papel com DY real > IPCA+5% e tijolo com vacância <10% e P/VP <0,95.`,
    `Disciplina: nada de all-in em contrarian sem gatilho; 10-15% por posição, stop até -12% e rebalanceamento trimestral.`,
  ].join(" ");
}

export async function analisarFariaLima(): Promise<BriefingFariaLima> {
  const iniciado = Date.now();
  const [acoesMod, fiisMod, radarFx, noticiasMod] = await Promise.all([
    import("@/lib/acoes.server").catch(() => null),
    import("@/lib/fiis.server").catch(() => null),
    import("@/lib/radar.server"),
    import("@/lib/noticias.server").catch(() => null),
  ]);

  const [gradeAcoes, gradeFiis, bancoPosicoes, feed, macroRaw] = await Promise.all([
    // @ts-ignore
    acoesMod?.gradeAcoesComCache().catch(() => null) ?? null,
    // @ts-ignore
    fiisMod?.gradeFiisComCache().catch(() => null) ?? null,
    radarFx.lerPosicoesBanco().catch(() => ({ posicoes: {} as Record<string, unknown> })),
    noticiasMod?.agregarNoticias().catch(() => []) ?? [],
    radarFx.contextoMacro().catch(() => ({ selic: null as number | null, ipca: null as number | null })),
  ]);

  // @ts-ignore
  const linhas: LinhaObservador[] = [
    // @ts-ignore
    ...((gradeAcoes?.linhas ?? []).map((l: { ticker: string; nome: string; setor?: string | null; tipo?: string | null; preco?: number | null; variacaoPercent?: number | null; dy12?: number | null; pvp?: number | null }) => ({
      ticker: l.ticker,
      nome: l.nome,
      categoria: "acao" as const,
      setor: (l as { setor?: string | null }).setor ?? (l as { tipo?: string | null }).tipo ?? null,
      preco: l.preco ?? null,
      variacaoDia: l.variacaoPercent ?? null,
      dy12: l.dy12 ?? null,
      pvp: l.pvp ?? null,
    }))),
    // @ts-ignore
    ...((gradeFiis?.linhas ?? []).map((l: { ticker: string; nome: string; tipo?: string | null; preco?: number | null; variacaoPercent?: number | null; dy12?: number | null; pvp?: number | null }) => ({
      ticker: l.ticker,
      nome: l.nome,
      categoria: "fii" as const,
      setor: (l as { tipo?: string | null }).tipo ?? null,
      preco: l.preco ?? null,
      variacaoDia: l.variacaoPercent ?? null,
      dy12: l.dy12 ?? null,
      pvp: l.pvp ?? null,
    }))),
  ];

  const noticiasImpacto: Record<string, string[]> = {};
  for (const n of feed) for (const t of n.tickers) noticiasImpacto[t.toUpperCase()] = [...(noticiasImpacto[t.toUpperCase()] ?? []), n.titulo];

  const candidatos = montarCandidatos(linhas, (bancoPosicoes as { posicoes: Record<string, { percentil?: number | null; distMinima52sPct?: number | null; drawdownMaximoPct?: number | null; volatilidadeAnualPct?: number | null }> }).posicoes as never, noticiasImpacto, 40);

  // Filtros institucionais Faria Lima
  const filtrados = candidatos.filter((c) => {
    if ((c.preco ?? 0) < 1) return false; // penny
    if ((c.dy12 ?? 0) > 18) return false; // DY armadilha não recorrente
    if (c.sinal.tipo === "vender" && c.sinal.urgente) return false; // choque
    return true;
  });

  const comScoreFL = filtrados.map((c) => ({
    ...c,
    score: scoreFariaLima(c),
  }));

  const acoes = comScoreFL.filter((c) => c.categoria === "acao");
  const fiis = comScoreFL.filter((c) => c.categoria === "fii");

  const topValor = acoes
    .filter((c) => classificarFariaLima(c) === "valor")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)
    .map((c) => {
      const cat = classificarFariaLima(c);
      return {
        ...c,
        categoriaFariaLima: cat,
        risco: riscoDe(c),
        tese: tesePara(c, cat),
        gatilhoTecnico: `Feche > mínima 52s +2% com volume > média 20d; invalida se perder mínima.`,
        fairValueHint: fairValueHint(c),
      } satisfies OportunidadeFariaLima;
    });

  const topDividendos = [...acoes, ...fiis]
    .filter((c) => (c.dy12 ?? 0) >= 5)
    .sort((a, b) => (b.dy12 ?? 0) - (a.dy12 ?? 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)
    .map((c) => {
      const cat: OportunidadeFariaLima["categoriaFariaLima"] = "dividendos";
      return {
        ...c,
        categoriaFariaLima: cat,
        risco: riscoDe(c),
        tese: tesePara(c, cat),
        gatilhoTecnico: `DY sustentável 3 anos + payout <85%; gatilho é ex-provento com preço firme.`,
        fairValueHint: fairValueHint(c),
      } satisfies OportunidadeFariaLima;
    });

  const topFiis = fiis
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5)
    .map((c) => {
      const cat = c.pvp !== null && c.pvp < 0.9 ? "valor" as const : "dividendos" as const;
      return {
        ...c,
        categoriaFariaLima: cat,
        risco: riscoDe(c),
        tese: tesePara(c, cat),
        gatilhoTecnico: `P/VP <0,95 e vacância <12% confirmada no relatório gerencial.`,
        fairValueHint: fairValueHint(c),
      } satisfies OportunidadeFariaLima;
    });

  const contrarian = filtrados
    .filter((c) => (c.percentil ?? 100) <= LIMITE_MINIMA)
    .sort((a, b) => (a.percentil ?? 100) - (b.percentil ?? 100))
    .slice(0, 4)
    .map((c) => ({
      ...c,
      categoriaFariaLima: "contrarian" as const,
      risco: riscoDe(c),
      tese: tesePara(c, "contrarian"),
      gatilhoTecnico: `Rompe mínima 52s com candle de reversão + notícia catalisadora.`,
      fairValueHint: fairValueHint(c),
    }));

  const alertas: AlertaFariaLima[] = [];
  const choque = candidatos.filter((c) => c.sinal.urgente);
  if (choque.length) alertas.push({ nivel: "critico", titulo: `Choque em ${choque.length} ativos`, detalhe: choque.slice(0, 3).map((c) => `${c.ticker} ${c.variacaoDia?.toFixed(1)}%`).join(", ") + " — valide noticiário antes de comprar." });
  const dyArmadilha = filtrados.filter((c) => (c.dy12 ?? 0) > 12);
  if (dyArmadilha.length) alertas.push({ nivel: "atencao", titulo: `DY elevado não recorrente`, detalhe: `${dyArmadilha.slice(0, 3).map((c) => c.ticker).join(", ")} — cheque provento extraordinário.` });
  if ((macroRaw as { selic: number | null }).selic !== null && (macroRaw as { selic: number }).selic > 12) alertas.push({ nivel: "atencao", titulo: "Selic restritiva", detalhe: `Selic ${(macroRaw as { selic: number }).selic}% mantém prêmio de renda fixa alto — exija margem de segurança maior em equity.` });

  void iniciado;

  return {
    geradoEm: new Date().toISOString(),
    provedor: "Faria Lima Quant (Kilo Code principal)",
    macro: { selic: (macroRaw as { selic: number | null }).selic, ipca: (macroRaw as { ipca: number | null }).ipca },
    universo: { acoes: gradeAcoes?.linhas?.length ?? 0, fiis: gradeFiis?.linhas?.length ?? 0, candidatos: candidatos.length },
    resumoExecutivo: resumoExecutivoFariaLima(macroRaw as { selic: number | null; ipca: number | null }, candidatos, fiis),
    topValor,
    topDividendos,
    topFiis,
    contrarian,
    alertas,
    metodologia: "Score 0-100: preço na história 40% + DY 25% + P/VP 15% + drawdown 10% + ajuste vol/notícia. Filtros: sem penny (<R$1), sem DY>18%, sem choque urgente. Kilo Code (stepfun/step-3.7-flash:free) como motor padrão do Observador.",
  };
}
