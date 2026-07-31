import { useCallback, useEffect, useState } from "react";
import { CLASSE_POS_FIXADO } from "@/lib/portfolio";

export type Perfil = "Conservador" | "Moderado" | "Arrojado" | "Agressivo";

export const PERFIS: Perfil[] = ["Conservador", "Moderado", "Arrojado", "Agressivo"];

export type LinhaRec = {
  id: string;
  grupo: string;
  risco: string;
  indexador: string;
  prazo: string;
  /** Chave da classe usada na alocação-alvo da carteira. */
  classe: string;
  alvo: number;
};

export type Versao = {
  id: string;
  data: string;
  perfil: Perfil;
  notas: string;
  linhas: LinhaRec[];
};

export type ConfigRec = {
  perfil: Perfil;
  notas: string;
  linhas: LinhaRec[];
};

export const CHAVE_CONFIG = "carteira-recomendada:config";
export const CHAVE_VERSOES = "carteira-recomendada:versoes";

export const novoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `l-${Math.random().toString(36).slice(2)}`;

const rf = (indexador: string, prazo: string, alvo: number): Omit<LinhaRec, "id"> => ({
  grupo: "Renda Fixa",
  risco: "Baixo",
  indexador,
  prazo,
  classe: CLASSE_POS_FIXADO,
  alvo,
});

const rv = (
  indexador: string,
  prazo: string,
  classe: string,
  alvo: number,
  risco = "Alto",
): Omit<LinhaRec, "id"> => ({ grupo: "Renda Variável", risco, indexador, prazo, classe, alvo });

/** Alocações de referência por perfil de investidor. */
const MODELOS: Record<Perfil, Omit<LinhaRec, "id">[]> = {
  Conservador: [
    rf("Tesouro SELIC (CDI)", "Liquidez imediata", 45),
    rf("Tesouro IPCA+", "Prazo maior que 5 anos", 25),
    rf("CDB / LCI / LCA", "2 a 4 anos", 10),
    rv("ETF - Brasil", "BOVA11", "ETFs - Brasil", 8),
    rv("ETF - Global", "IVVB11", "ETFs - Global", 7),
    rv("FIIs (Fundos Imobiliários)", "MXRF11 (Maxi Renda)", "FIIs", 5, "Médio"),
  ],
  Moderado: [
    rf("Tesouro SELIC (CDI)", "Liquidez imediata", 30),
    rf("Tesouro IPCA+", "Prazo maior que 5 anos", 15),
    rf("Tesouro Prefixado", "Prazo maior que 5 anos", 5),
    rv("ETF - Brasil", "BOVA11", "ETFs - Brasil", 18),
    rv("ETF - Global", "IVVB11", "ETFs - Global", 20),
    rv("FIIs (Fundos Imobiliários)", "MXRF11 (Maxi Renda)", "FIIs", 6, "Médio"),
    rv("FIIs (Fundos Imobiliários)", "XPML11 (XP Malls)", "FIIs", 6, "Médio"),
  ],
  Arrojado: [
    rf("Tesouro SELIC (CDI)", "Liquidez imediata", 20),
    rf("Tesouro IPCA+", "Prazo maior que 5 anos", 10),
    rv("ETF - Brasil", "BOVA11", "ETFs - Brasil", 22),
    rv("ETF - Global", "IVVB11", "ETFs - Global", 25),
    rv("FIIs (Fundos Imobiliários)", "MCRE11 (Mauá Capital Real Estate)", "FIIs", 5, "Médio"),
    rv("FIIs (Fundos Imobiliários)", "BTLG11 (BTG Logística)", "FIIs", 5, "Médio"),
    rv("Ações", "Carteira de dividendos (blue chips)", "Ações", 10),
    rv("Criptomoedas", "BTC / ETH via ETF ou exchange", "Criptomoedas", 3),
  ],
  Agressivo: [
    rf("Tesouro SELIC (CDI)", "Liquidez imediata", 15),
    rf("Tesouro IPCA+", "Prazo maior que 5 anos", 10),
    rv("ETF - Brasil", "BOVA11", "ETFs - Brasil", 20),
    rv("ETF - Global", "IVVB11", "ETFs - Global", 25),
    rv("FIIs (Fundos Imobiliários)", "MCRE11 (Mauá Capital Real Estate)", "FIIs", 4, "Médio"),
    rv("FIIs (Fundos Imobiliários)", "TRXF11 (TRX Real Estate)", "FIIs", 4, "Médio"),
    rv("Ações", "Carteira de crescimento (small caps)", "Ações", 12),
    rv("Stocks", "Ações internacionais (VOO, AAPL, MSFT)", "Stocks", 5),
    rv("Criptomoedas", "BTC / ETH via ETF ou exchange", "Criptomoedas", 5),
  ],
};

export function modeloDoPerfil(perfil: Perfil): LinhaRec[] {
  return MODELOS[perfil].map((l) => ({ ...l, id: novoId() }));
}

function lerConfig(): ConfigRec | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_CONFIG);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto) as ConfigRec;
    if (!Array.isArray(salvo.linhas)) return null;
    return salvo;
  } catch {
    return null;
  }
}

function lerVersoes(): Versao[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_VERSOES);
    const salvo = bruto ? (JSON.parse(bruto) as Versao[]) : [];
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

/** Estado da carteira recomendada do cliente, persistido no navegador. */
export function useCarteiraRecomendadaStore() {
  const [perfil, setPerfil] = useState<Perfil>("Agressivo");
  const [linhas, setLinhas] = useState<LinhaRec[]>(() => modeloDoPerfil("Agressivo"));
  const [notas, setNotas] = useState("");
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const cfg = lerConfig();
    if (cfg) {
      setPerfil(cfg.perfil ?? "Agressivo");
      setLinhas(cfg.linhas);
      setNotas(cfg.notas ?? "");
    }
    setVersoes(lerVersoes());
    setPronto(true);
  }, []);

  const trocarPerfil = useCallback((p: Perfil) => {
    setPerfil(p);
    setLinhas(modeloDoPerfil(p));
  }, []);

  const salvarVersao = useCallback(() => {
    const versao: Versao = {
      id: novoId(),
      data: new Date().toISOString(),
      perfil,
      notas,
      linhas,
    };
    const proximas = [versao, ...versoes].slice(0, 20);
    setVersoes(proximas);
    window.localStorage.setItem(CHAVE_VERSOES, JSON.stringify(proximas));
    window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify({ perfil, notas, linhas }));
    return versao;
  }, [perfil, notas, linhas, versoes]);

  const restaurarVersao = useCallback((v: Versao) => {
    setPerfil(v.perfil);
    setNotas(v.notas ?? "");
    setLinhas(v.linhas.map((l) => ({ ...l, id: novoId() })));
  }, []);

  return {
    perfil,
    setPerfil,
    trocarPerfil,
    linhas,
    setLinhas,
    notas,
    setNotas,
    versoes,
    salvarVersao,
    restaurarVersao,
    pronto,
  };
}
