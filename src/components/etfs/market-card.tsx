import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/panel";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { useMarketQuote } from "@/lib/use-market-quote";
import { TextoTruncado } from "@/components/texto-truncado";
import { useFavoritos } from "@/lib/favoritos-mercado";
import type { CotacaoBrapi } from "@/lib/mercado-brapi.functions";

const SUGESTOES = ["IVVB11", "BOVA11", "SMAL11", "HASH11", "PETR4", "VALE3", "ITUB4", "MXRF11"];

const moeda = (v: number | null, cur = "BRL") =>
  v === null
    ? "—"
    : `${cur === "USD" ? "US$" : "R$"} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numero = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR"));

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour12: false }) : "—";

/** Detecta subida/queda entre atualizações para animar o preço. */
function useFlash(preco: number | null) {
  const anterior = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (preco === null) return;
    const antes = anterior.current;
    anterior.current = preco;
    if (antes === null || antes === preco) return;
    setFlash(preco > antes ? "up" : "down");
    const id = window.setTimeout(() => setFlash(null), 900);
    return () => window.clearTimeout(id);
  }, [preco]);
  return flash;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-muted/30 p-bloco">
      <TextoTruncado as="p" className="t-label block">
        {rotulo}
      </TextoTruncado>
      <TextoTruncado as="p" className="t-num mt-0.5 block">
        {valor}
      </TextoTruncado>
    </div>
  );
}

/** Cartão de cotação em tempo real (BRAPI) de um ativo. */
export function MarketCard({ symbol }: { symbol: string }) {
  const { loading, error, quote, refresh } = useMarketQuote(symbol);
  const flash = useFlash(quote?.regularMarketPrice ?? null);
  const { alternar, ehFavorito } = useFavoritos();
  const favorito = ehFavorito(symbol);

  if (loading && !quote) {
    return (
      <div className="pilha-bloco">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-40" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return <p className="t-body-sm text-negative">{error}</p>;
  }

  if (!quote) return null;

  const q: CotacaoBrapi = quote;
  const pos = (q.regularMarketChangePercent ?? 0) >= 0;
  const aberto = (q.marketState ?? "").toUpperCase() === "REGULAR";

  return (
    <div className="pilha-bloco">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="t-ticker font-display shrink-0">{q.symbol}</p>
            <button
              type="button"
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={favorito}
              onClick={() => alternar(q.symbol)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
            >
              <Star className={`size-4 ${favorito ? "fill-primary text-primary" : ""}`} />
            </button>
          </div>
          <TextoTruncado as="p" className="t-subtexto block">
            {q.longName ?? q.shortName ?? "—"}
          </TextoTruncado>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            aberto
              ? "border-positive/30 bg-positive/10 text-positive"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${aberto ? "animate-pulse bg-positive" : "bg-muted-foreground"}`}
          />
          {aberto ? "Mercado aberto" : "Mercado fechado"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <p
          className={`font-display text-3xl leading-none tabular-nums transition-colors duration-500 ${
            flash === "up" ? "text-positive" : flash === "down" ? "text-negative" : ""
          }`}
        >
          {moeda(q.regularMarketPrice, q.currency)}
        </p>
        <p className={`t-num font-semibold ${pos ? "text-positive" : "text-negative"}`}>
          {pos ? "▲" : "▼"}{" "}
          {q.regularMarketChangePercent === null
            ? "—"
            : `${pos ? "+" : ""}${q.regularMarketChangePercent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
          <span className="ml-2 text-muted-foreground">
            {q.regularMarketChange === null
              ? ""
              : `${pos ? "+" : ""}${q.regularMarketChange.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </p>
        <Sparkline serie={q.spark} positivo={pos} largura={120} altura={34} className="ml-auto" />
      </div>

      <div className="grid grid-cols-2 gap-bloco sm:grid-cols-3 lg:grid-cols-6">
        <Linha rotulo="Máxima" valor={moeda(q.regularMarketDayHigh, q.currency)} />
        <Linha rotulo="Mínima" valor={moeda(q.regularMarketDayLow, q.currency)} />
        <Linha rotulo="Abertura" valor={moeda(q.regularMarketOpen, q.currency)} />
        <Linha rotulo="Fech. anterior" valor={moeda(q.regularMarketPreviousClose, q.currency)} />
        <Linha rotulo="Volume" valor={numero(q.regularMarketVolume)} />
        <Linha rotulo="Atualizado" valor={hora(q.regularMarketTime)} />
      </div>

      <div className="flex items-center gap-2 t-caption text-muted-foreground">
        <Activity className="size-3.5" aria-hidden />
        Sincronizado a cada 5s pela BRAPI
        <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={refresh}>
          <RefreshCw className="size-3.5" />
          Atualizar
        </Button>
      </div>
    </div>
  );
}

/**
 * Bloco de cotação em tempo real com busca de qualquer ativo da B3.
 * Complementa a grade de ETFs com preço, máxima/mínima, volume e sparkline ao vivo.
 */
export function CotacaoAoVivoBrapi({ inicial = "IVVB11" }: { inicial?: string }) {
  const [symbol, setSymbol] = useState(inicial.toUpperCase());
  const [texto, setTexto] = useState(inicial.toUpperCase());

  return (
    <Panel
      title="Cotação em tempo real"
      hint="Pesquise qualquer ETF, ação ou FII da B3 — dados ao vivo da BRAPI, atualizados a cada 5 segundos"
      action={
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const limpo = texto.trim().toUpperCase();
            if (limpo) setSymbol(limpo);
          }}
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value.toUpperCase())}
            placeholder="Ex.: IVVB11"
            aria-label="Pesquisar ativo na BRAPI"
            className="h-9 w-[160px] text-sm"
          />
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </form>
      }
    >
      <div className="pilha-bloco">
        <div className="flex flex-wrap gap-1.5">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSymbol(s);
                setTexto(s);
              }}
              aria-pressed={symbol === s}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                symbol === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <MarketCard symbol={symbol} />
      </div>
    </Panel>
  );
}
