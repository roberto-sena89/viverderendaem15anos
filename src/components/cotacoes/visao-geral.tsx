import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { ModalDetalhePanorama } from "@/components/cotacoes/modal-detalhe-panorama";
import { corVar, fmtPercent } from "@/components/cotacoes/formatos";
import { ABAS_COTACOES } from "@/lib/cotacoes-abas";
import {
  panoramaMercado,
  type LinhaResumo,
  type PanoramaMercado,
  type ResumoCategoria,
} from "@/lib/panorama-mercado.functions";

/** Abre a aba do terminal, opcionalmente já filtrada por um ticker. */
export type AbrirAba = (id: string, filtro?: string) => void;

const ICONE_ABA = Object.fromEntries(ABAS_COTACOES.map((a) => [a.id, a.icone]));

export function VisaoGeralMercado({
  intervaloMs,
  aoAbrirAba,
}: {
  intervaloMs: number;
  aoAbrirAba?: AbrirAba;
}) {
  const buscar = useServerFn(panoramaMercado);
  const [detalhe, setDetalhe] = useState<{ linha: LinhaResumo; categoria?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["panorama-mercado"],
    queryFn: () => buscar(),
    refetchInterval: intervaloMs > 0 ? intervaloMs : false,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ModalDetalhePanorama
        linha={detalhe?.linha ?? null}
        rotuloCategoria={detalhe?.categoria}
        aberto={detalhe !== null}
        aoFechar={() => setDetalhe(null)}
        aoAbrirAba={aoAbrirAba}
      />

      <Termometro data={data} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.categorias.map((c) => (
          <CartaoCategoria
            key={c.id}
            resumo={c}
            aoAbrirAba={aoAbrirAba}
            aoDetalhar={(linha) => setDetalhe({ linha, categoria: c.rotulo })}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Maiores altas do dia"
          hint="Ações, FIIs e criptomoedas"
          bodyClassName="p-0"
          action={<TrendingUp className="size-4 text-positive" aria-hidden />}
        >
          <ListaCompacta linhas={data.altas} aoDetalhar={(l) => setDetalhe({ linha: l })} />
        </Panel>
        <Panel
          title="Maiores baixas do dia"
          hint="Ações, FIIs e criptomoedas"
          bodyClassName="p-0"
          action={<TrendingDown className="size-4 text-negative" aria-hidden />}
        >
          <ListaCompacta linhas={data.baixas} aoDetalhar={(l) => setDetalhe({ linha: l })} />
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------- termômetro ------------------------------ */

function Termometro({ data }: { data: PanoramaMercado }) {
  const t = data.termometro;
  const emAlta = t.percentual;
  const clima =
    emAlta >= 60 ? "Predomínio comprador" : emAlta <= 40 ? "Predomínio vendedor" : "Mercado equilibrado";

  return (
    <section className="panel relative overflow-hidden p-4 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Panorama do mercado
          </p>
          <p className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{clima}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.emAlta} em alta · {t.emBaixa} em baixa · {t.total} ativos monitorados
          </p>

          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="h-full bg-positive transition-[width] duration-700"
              style={{ width: `${emAlta}%` }}
            />
            <span className="h-full flex-1 bg-negative/70" />
          </div>
          <div className="mt-1.5 flex justify-between text-[0.7rem] tabular-nums text-muted-foreground">
            <span className="text-positive">{emAlta}% em alta</span>
            <span className="text-negative">{100 - emAlta}% em baixa</span>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {data.indices.map((l) => (
            <div
              key={l.ticker}
              className="min-w-0 rounded-xl border border-border/60 bg-background/40 p-2.5"
            >
              <p className="truncate text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {l.ticker}
              </p>
              <p className="mt-0.5 truncate font-display text-[0.95rem] tabular-nums">{l.valor}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className={`text-[0.7rem] tabular-nums ${corVar(l.variacao)}`}>
                  {fmtPercent(l.variacao)}
                </span>
                <Sparkline
                  serie={l.spark}
                  positivo={(l.variacao ?? 0) >= 0}
                  largura={48}
                  altura={18}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- cartão por aba ----------------------------- */

function CartaoCategoria({
  resumo,
  aoAbrirAba,
  aoDetalhar,
}: {
  resumo: ResumoCategoria;
  aoAbrirAba?: AbrirAba;
  aoDetalhar: (linha: LinhaResumo) => void;
}) {
  const Icone = ICONE_ABA[resumo.id];
  const clicavel = Boolean(aoAbrirAba);

  return (
    <div className="panel group flex h-full flex-col p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <button
        type="button"
        disabled={!clicavel}
        onClick={() => aoAbrirAba?.(resumo.id)}
        aria-label={`Abrir aba ${resumo.rotulo}`}
        className="flex items-start gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none disabled:cursor-default"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          {Icone ? <Icone className="size-4" aria-hidden /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{resumo.rotulo}</span>
          <span className="block truncate text-xs text-muted-foreground">{resumo.legenda}</span>
        </span>
        {clicavel ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
        ) : null}
      </button>

      {resumo.indisponivel ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem dados disponíveis no momento.</p>
      ) : (
        <>
          {resumo.destaque ? (
            <div className="mt-4">
              <p className="truncate text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
                {resumo.destaque.rotulo}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="truncate font-display text-xl tabular-nums sm:text-2xl">
                  {resumo.destaque.valor}
                </span>
                {resumo.destaque.variacao !== null ? (
                  <span className={`text-xs tabular-nums ${corVar(resumo.destaque.variacao)}`}>
                    {fmtPercent(resumo.destaque.variacao)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {resumo.metricas.length ? (
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {resumo.metricas.slice(0, 3).map((m) => (
                <div key={m.rotulo} className="min-w-0 rounded-lg bg-muted/40 px-2 py-1.5">
                  <dt className="truncate text-[0.65rem] tracking-[0.08em] text-muted-foreground uppercase">
                    {m.rotulo}
                  </dt>
                  <dd className="truncate text-xs font-medium tabular-nums">{m.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {resumo.amplitude && resumo.amplitude.total > 0 ? (
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="h-full bg-positive"
                style={{
                  width: `${Math.round((resumo.amplitude.emAlta / resumo.amplitude.total) * 100)}%`,
                }}
              />
              <span className="h-full flex-1 bg-negative/60" />
            </div>
          ) : null}

          {resumo.altas.length ? (
            <ul className="mt-3 space-y-1 border-t border-border/60 pt-3">
              {resumo.altas.map((l) => (
                <li key={`${resumo.id}-${l.ticker}`}>
                  <LinhaClicavel linha={l} aoDetalhar={aoDetalhar} compacta />
                </li>
              ))}
            </ul>
          ) : null}

          {clicavel ? (
            <button
              type="button"
              onClick={() => aoAbrirAba?.(resumo.id)}
              className="mt-3 self-start text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              Ver grade completa de {resumo.rotulo} →
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ------------------------------- listas ---------------------------------- */

function LinhaClicavel({
  linha,
  aoDetalhar,
  compacta = false,
}: {
  linha: LinhaResumo;
  aoDetalhar?: (linha: LinhaResumo) => void;
  compacta?: boolean;
}) {
  const conteudo = (
    <>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${compacta ? "text-xs" : "text-sm"}`}>
          {linha.ticker}
        </span>
        <span
          className={`block truncate text-muted-foreground ${compacta ? "text-[0.68rem]" : "text-xs"}`}
        >
          {linha.nome}
        </span>
      </span>
      {compacta ? null : (
        <Sparkline
          serie={linha.spark}
          positivo={(linha.variacao ?? 0) >= 0}
          largura={56}
          altura={22}
        />
      )}
      <span className="shrink-0 text-right">
        <span className={`block tabular-nums ${compacta ? "text-xs" : "text-sm"}`}>
          {linha.valor}
        </span>
        {linha.variacao !== null ? (
          <span
            className={`block tabular-nums ${compacta ? "text-[0.68rem]" : "text-xs"} ${corVar(linha.variacao)}`}
          >
            {fmtPercent(linha.variacao)}
          </span>
        ) : null}
      </span>
    </>
  );

  const base = compacta
    ? "flex w-full items-center gap-2 rounded-md px-1 py-1 text-left"
    : "flex w-full items-center gap-3 px-4 py-2 text-left";

  if (!aoDetalhar) return <div className={base}>{conteudo}</div>;

  return (
    <button
      type="button"
      onClick={() => aoDetalhar(linha)}
      aria-label={`Ver detalhes de ${linha.ticker}`}
      className={`${base} transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none`}
    >
      {conteudo}
    </button>
  );
}

function ListaCompacta({
  linhas,
  aoDetalhar,
}: {
  linhas: LinhaResumo[];
  aoDetalhar?: (linha: LinhaResumo) => void;
}) {
  if (linhas.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Sem dados disponíveis no momento.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {linhas.map((l) => (
        <li key={`${l.destino}-${l.ticker}`}>
          <LinhaClicavel linha={l} aoDetalhar={aoDetalhar} />
        </li>
      ))}
    </ul>
  );
}

