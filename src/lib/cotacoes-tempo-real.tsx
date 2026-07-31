import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { notificarPush, registrarAlerta } from "@/lib/alertas-historico";
import {
  itensStreamaveis,
  useCotacoesStream,
  type StatusStream,
} from "@/lib/cotacoes-stream";
import { cotacoesCarteira, type CotacaoLive } from "@/lib/cotacoes.functions";
import { useAtivos } from "@/lib/data";
import type { Ativo } from "@/lib/portfolio";


/* ---------------------------------------------------------------- *
 * Preferências do usuário (persistidas no navegador)
 * ---------------------------------------------------------------- */

export interface ConfigSync {
  /** Sincronização automática ligada/desligada. */
  automatico: boolean;
  /** Intervalo de polling em milissegundos. */
  intervaloMs: number;
  /** Alerta quando um ativo variar acima deste percentual no dia. */
  alertaAtivo: boolean;
  alertaPercent: number;
  /** Também enviar notificação push nativa do navegador. */
  pushAtivo: boolean;
}


export const INTERVALOS = [
  { ms: 15_000, rotulo: "15s" },
  { ms: 30_000, rotulo: "30s" },
  { ms: 60_000, rotulo: "1min" },
  { ms: 300_000, rotulo: "5min" },
] as const;

const CONFIG_PADRAO: ConfigSync = {
  automatico: true,
  intervaloMs: 30_000,
  alertaAtivo: false,
  alertaPercent: 5,
  pushAtivo: false,
};


const CHAVE_CONFIG = "cotacoes:config";
const CHAVE_CACHE = "cotacoes:cache";

function lerConfig(): ConfigSync {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_CONFIG);
    return bruto ? { ...CONFIG_PADRAO, ...(JSON.parse(bruto) as Partial<ConfigSync>) } : CONFIG_PADRAO;
  } catch {
    return CONFIG_PADRAO;
  }
}

function lerCache(): CotacaoLive[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_CACHE);
    return bruto ? (JSON.parse(bruto) as CotacaoLive[]) : [];
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------- *
 * Pregão da B3 (dias úteis, 9h–18h de Brasília)
 * ---------------------------------------------------------------- */

export function estadoPregao(referencia = new Date()) {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = Object.fromEntries(fmt.formatToParts(referencia).map((p) => [p.type, p.value]));
  const hora = Number(partes.hour ?? 0);
  const minuto = Number(partes.minute ?? 0);
  const dia = String(partes.weekday ?? "").toLowerCase();
  const fimDeSemana = dia.startsWith("sáb") || dia.startsWith("sab") || dia.startsWith("dom");
  const minutos = hora * 60 + minuto;
  const aberto = !fimDeSemana && minutos >= 9 * 60 && minutos < 18 * 60;

  let proximaAbertura = "próximo dia útil às 9h";
  if (!aberto) {
    if (!fimDeSemana && minutos < 9 * 60) proximaAbertura = "hoje às 9h";
    else if (dia.startsWith("sex")) proximaAbertura = "segunda-feira às 9h";
    else if (fimDeSemana) proximaAbertura = "segunda-feira às 9h";
    else proximaAbertura = "amanhã às 9h";
  }
  return { aberto, proximaAbertura };
}

/**
 * Pregão de Nova York (NYSE/Nasdaq), em horário de Brasília.
 * Cobre ETFs globais, stocks e REITs, que continuam negociando depois
 * do fechamento da B3 — janela ampla (10h30–22h) para cobrir o horário
 * de verão americano.
 */
export function estadoMercadoGlobal(referencia = new Date()) {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = Object.fromEntries(fmt.formatToParts(referencia).map((p) => [p.type, p.value]));
  const minutos = Number(partes.hour ?? 0) * 60 + Number(partes.minute ?? 0);
  const dia = String(partes.weekday ?? "").toLowerCase();
  const fimDeSemana = dia.startsWith("sáb") || dia.startsWith("sab") || dia.startsWith("dom");
  return { aberto: !fimDeSemana && minutos >= 10 * 60 + 30 && minutos < 22 * 60 };
}

/* ---------------------------------------------------------------- *
 * Contexto
 * ---------------------------------------------------------------- */

export type StatusSync = "ao-vivo" | "atualizando" | "desatualizado" | "manual";

interface ContextoCotacoes {
  mapa: Map<string, CotacaoLive>;
  /** Ticker -> direção do último movimento, usado para o efeito de flash. */
  flash: Record<string, "alta" | "baixa">;
  status: StatusSync;
  atualizadoEm: number | null;
  pregaoAberto: boolean;
  proximaAbertura: string;
  atualizarAgora: () => void;
  carregando: boolean;
  config: ConfigSync;
  salvarConfig: (parcial: Partial<ConfigSync>) => void;
  /** Streaming (SSE) ativo para os ativos internacionais da carteira. */
  streaming: boolean;
  statusStream: StatusStream;
}

const Ctx = createContext<ContextoCotacoes | null>(null);


const chaveTicker = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

export function CotacoesTempoRealProvider({ children }: { children: ReactNode }) {
  const { data: ativos = [] } = useAtivos();
  const buscar = useServerFn(cotacoesCarteira);

  const [config, setConfig] = useState<ConfigSync>(CONFIG_PADRAO);
  const [flash, setFlash] = useState<Record<string, "alta" | "baixa">>({});
  const [cache, setCache] = useState<CotacaoLive[]>([]);
  const [pregao, setPregao] = useState(() => estadoPregao());
  const [mercadoGlobal, setMercadoGlobal] = useState(() => estadoMercadoGlobal());
  const precosAnteriores = useRef<Record<string, number>>({});
  const alertados = useRef<Set<string>>(new Set());

  useEffect(() => {
    setConfig(lerConfig());
    setCache(lerCache());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPregao(estadoPregao());
      setMercadoGlobal(estadoMercadoGlobal());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const salvarConfig = useCallback((parcial: Partial<ConfigSync>) => {
    setConfig((atual) => {
      const novo = { ...atual, ...parcial };
      try {
        window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify(novo));
      } catch {
        /* armazenamento indisponível */
      }
      return novo;
    });
  }, []);

  const itens = useMemo(
    () => ativos.map((a) => ({ ticker: a.ticker, categoria: String(a.categoria) })),
    [ativos],
  );

  // Ativos internacionais (ETFs globais, stocks, REITs, cripto) seguem
  // negociando fora do pregão da B3 — o polling acompanha essas janelas.
  const temInternacional = useMemo(
    () =>
      ativos.some((a) =>
        ["ETF (Exterior)", "ETF EUA", "Stocks", "REITs", "BDR", "Criptomoedas"].includes(
          String(a.categoria),
        ),
      ),
    [ativos],
  );
  const cripto = useMemo(
    () => ativos.some((a) => String(a.categoria) === "Criptomoedas"),
    [ativos],
  );
  const mercadoAtivo =
    pregao.aberto || cripto || (temInternacional && mercadoGlobal.aberto);

  // Ativos que a fonte consegue transmitir por streaming (SSE).
  const itensStream = useMemo(() => itensStreamaveis(ativos), [ativos]);

  const [streamCotacoes, setStreamCotacoes] = useState<CotacaoLive[]>([]);
  const [streamEm, setStreamEm] = useState<number | null>(null);

  const aoReceberStream = useCallback((cotacoes: CotacaoLive[]) => {
    setStreamCotacoes((atual) => {
      const m = new Map(atual.map((c) => [chaveTicker(c.ticker), c] as const));
      for (const c of cotacoes) if (c.preco !== null) m.set(chaveTicker(c.ticker), c);
      return [...m.values()];
    });
    setStreamEm(Date.now());
  }, []);

  const { status: statusStream, streaming } = useCotacoesStream(itensStream, {
    habilitado: config.automatico,
    aoReceber: aoReceberStream,
  });

  // Com streaming ativo, os internacionais já chegam empurrados: o polling
  // só precisa cobrir os ativos da B3 (e cai para 5min fora do pregão dela).
  const precisaPolling = pregao.aberto || (!streaming && mercadoAtivo);
  const intervaloBase = streaming && !pregao.aberto ? 300_000 : config.intervaloMs;
  const intervalo = config.automatico ? (precisaPolling ? intervaloBase : false) : false;

  const { data, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["cotacoes-carteira", itens.map((i) => `${i.ticker}:${i.categoria}`).sort().join(",")],
    queryFn: () => buscar({ data: { itens } }),
    enabled: itens.length > 0,
    refetchInterval: intervalo,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: config.automatico,
    staleTime: 10_000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  // Cache local (fallback quando a fonte fica indisponível).
  useEffect(() => {
    if (!data?.cotacoes?.length) return;
    setCache(data.cotacoes);
    try {
      window.localStorage.setItem(CHAVE_CACHE, JSON.stringify(data.cotacoes));
    } catch {
      /* ignora cota excedida */
    }
  }, [data]);

  const mapa = useMemo(() => {
    const m = new Map<string, CotacaoLive>();
    for (const c of cache) m.set(chaveTicker(c.ticker), c);
    for (const c of data?.cotacoes ?? []) if (c.preco !== null) m.set(chaveTicker(c.ticker), c);
    // O streaming tem prioridade: é o dado mais recente disponível.
    for (const c of streamCotacoes) if (c.preco !== null) m.set(chaveTicker(c.ticker), c);
    return m;
  }, [cache, data, streamCotacoes]);

  // Flash + alertas de variação (tanto para o polling quanto para o stream).
  const processarCotacoes = useCallback(
    (cotacoes: CotacaoLive[]) => {
      const novos: Record<string, "alta" | "baixa"> = {};
      for (const c of cotacoes) {
        if (c.preco === null) continue;
        const chave = chaveTicker(c.ticker);
        const anterior = precosAnteriores.current[chave];
        if (anterior !== undefined && anterior !== c.preco) {
          novos[chave] = c.preco > anterior ? "alta" : "baixa";
        }
        precosAnteriores.current[chave] = c.preco;

        if (
          config.alertaAtivo &&
          c.variacaoPercent !== null &&
          Math.abs(c.variacaoPercent) >= config.alertaPercent
        ) {
          const marca = `${chave}:${new Date().toISOString().slice(0, 10)}`;
          if (!alertados.current.has(marca)) {
            alertados.current.add(marca);
            const sinal = c.variacaoPercent > 0 ? "+" : "";
            const texto = `${chave} variou ${sinal}${c.variacaoPercent.toFixed(2)}% hoje.`;
            toast.info(texto);
            const push = config.pushAtivo && notificarPush("Alerta de variação", texto);
            registrarAlerta({
              ticker: chave,
              variacaoPercent: c.variacaoPercent,
              preco: c.preco,
              limite: config.alertaPercent,
              canais: push ? ["no app", "push"] : ["no app"],
            });
          }
        }
      }
      if (Object.keys(novos).length === 0) return;
      setFlash((f) => ({ ...f, ...novos }));
      window.setTimeout(() => {
        setFlash((f) => {
          const copia = { ...f };
          for (const k of Object.keys(novos)) delete copia[k];
          return copia;
        });
      }, 1600);
    },
    [config.alertaAtivo, config.alertaPercent, config.pushAtivo],
  );

  useEffect(() => {
    if (data?.cotacoes?.length) processarCotacoes(data.cotacoes);
  }, [data, processarCotacoes]);

  useEffect(() => {
    if (streamCotacoes.length) processarCotacoes(streamCotacoes);
    // Reprocessa apenas quando chega um novo lote empurrado pela fonte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamEm]);


  const status: StatusSync = isFetching
    ? "atualizando"
    : isError
      ? "desatualizado"
      : !config.automatico
        ? "manual"
        : "ao-vivo";

  const valor: ContextoCotacoes = {
    mapa,
    flash,
    status,
    atualizadoEm: Math.max(dataUpdatedAt || 0, streamEm ?? 0) || null,
    pregaoAberto: pregao.aberto,
    proximaAbertura: pregao.proximaAbertura,
    atualizarAgora: () => void refetch(),
    carregando: isFetching,
    config,
    salvarConfig,
    streaming,
    statusStream,
  };


  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCotacoesTempoReal(): ContextoCotacoes {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // Fora do provider (ex.: páginas públicas): estado inerte.
  return {
    mapa: new Map(),
    flash: {},
    status: "manual",
    atualizadoEm: null,
    pregaoAberto: estadoPregao().aberto,
    proximaAbertura: estadoPregao().proximaAbertura,
    atualizarAgora: () => {},
    carregando: false,
    config: CONFIG_PADRAO,
    salvarConfig: () => {},
    streaming: false,
    statusStream: "inativo",
  };

}

/** Aplica as cotações ao vivo sobre a lista de ativos vinda do banco. */
export function aplicarCotacoes(ativos: Ativo[], mapa: Map<string, CotacaoLive>): Ativo[] {
  if (mapa.size === 0) return ativos;
  return ativos.map((a) => {
    const c = mapa.get(chaveTicker(a.ticker));
    return c && c.preco !== null && c.preco > 0 ? { ...a, precoAtual: c.preco } : a;
  });
}

/** Ativos da carteira já com o preço em tempo real aplicado. */
export function useAtivosAoVivo() {
  const { data: ativos = [], ...resto } = useAtivos();
  const { mapa } = useCotacoesTempoReal();
  const dados = useMemo(() => aplicarCotacoes(ativos, mapa), [ativos, mapa]);
  return { ...resto, data: dados };
}

/** Cotação ao vivo de um ticker específico. */
export function useCotacaoDe(ticker: string) {
  const { mapa, flash } = useCotacoesTempoReal();
  const chave = chaveTicker(ticker);
  return { cotacao: mapa.get(chave) ?? null, flash: flash[chave] ?? null };
}

export { chaveTicker };
