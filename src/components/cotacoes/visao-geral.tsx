import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { ModalDetalhePanorama } from "@/components/cotacoes/modal-detalhe-panorama";
import { corVar, fmtPercent } from "@/components/cotacoes/formatos";
import { TextoTruncado } from "@/components/texto-truncado";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ABAS_COTACOES } from "@/lib/cotacoes-abas";
import { EstadoVazio } from "@/components/estado-vazio";
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
      <div className="container-panorama pilha-secao">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grade-panorama">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="container-panorama pilha-secao">
      <ModalDetalhePanorama
        linha={detalhe?.linha ?? null}
        rotuloCategoria={detalhe?.categoria}
        aberto={detalhe !== null}
        aoFechar={() => setDetalhe(null)}
        aoAbrirAba={aoAbrirAba}
      />

      <Termometro data={data} />

      <div className="grade-panorama">
        {data.categorias.map((c) => (
          <CartaoCategoria
            key={c.id}
            resumo={c}
            aoAbrirAba={aoAbrirAba}
            aoDetalhar={(linha) => setDetalhe({ linha, categoria: c.rotulo })}
          />
        ))}
      </div>

      <div className="grade-paineis">
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
    </TooltipProvider>
  );
}


/* ------------------------------- termômetro ------------------------------ */

function Termometro({ data }: { data: PanoramaMercado }) {
  const t = data.termometro;
  const emAlta = t.percentual;
  const clima =
    emAlta >= 60 ? "Predomínio comprador" : emAlta <= 40 ? "Predomínio vendedor" : "Mercado equilibrado";

  return (
    <section className="panel relative overflow-hidden p-cartao">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative grid gap-secao lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="t-label">Panorama do mercado</p>
          <p className="t-h2 mt-1 texto-seguro">{clima}</p>
          <p className="t-caption mt-1 texto-seguro">
            {t.emAlta} em alta · {t.emBaixa} em baixa · {t.total} ativos monitorados
          </p>

          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="h-full bg-positive transition-[width] duration-700"
              style={{ width: `${emAlta}%` }}
            />
            <span className="h-full flex-1 bg-negative/70" />
          </div>
          <div className="t-num-sm mt-1.5 flex justify-between gap-2 text-muted-foreground">
            <span className="truncate text-positive">{emAlta}% em alta</span>
            <span className="truncate text-negative">{100 - emAlta}% em baixa</span>
          </div>
        </div>

        <div className="grade-metricas">
          {data.indices.map((l) => (
            <div
              key={l.ticker}
              className="min-w-0 rounded-xl border border-border/60 bg-background/40 p-bloco"
            >
              <TextoTruncado as="p" className="t-label truncate">
                {l.ticker}
              </TextoTruncado>
              <TextoTruncado as="p" className="t-num mt-0.5 truncate font-display">
                {l.valor}
              </TextoTruncado>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className={`t-num-sm truncate ${corVar(l.variacao)}`}>
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
    <div className="panel group flex h-full flex-col p-cartao text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <button
        type="button"
        disabled={!clicavel}
        onClick={() => aoAbrirAba?.(resumo.id)}
        aria-label={`Abrir aba ${resumo.rotulo}`}
        className="foco-visivel alvo-toque-linha flex items-start gap-3 rounded-lg text-left disabled:cursor-default"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          {Icone ? <Icone className="size-4" aria-hidden /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <TextoTruncado className="t-card-title block truncate">{resumo.rotulo}</TextoTruncado>
          <TextoTruncado className="t-subtexto block">{resumo.legenda}</TextoTruncado>
        </span>
        {clicavel ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
        ) : null}
      </button>

      {resumo.indisponivel ? (
        <p className="t-body-sm mt-bloco text-muted-foreground">Sem dados disponíveis no momento.</p>
      ) : (
        <>
          {resumo.destaque ? (
            <div className="mt-bloco min-w-0">
              <TextoTruncado as="p" className="t-label truncate">
                {resumo.destaque.rotulo}
              </TextoTruncado>
              <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                <TextoTruncado className="t-metric-sm min-w-0 truncate">
                  {resumo.destaque.valor}
                </TextoTruncado>
                {resumo.destaque.variacao !== null ? (
                  <span
                    className={`t-num-sm shrink-0 ${corVar(resumo.destaque.variacao)}`}
                  >
                    {fmtPercent(resumo.destaque.variacao)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {resumo.metricas.length ? (
            <dl className="grade-metricas mt-bloco">
              {resumo.metricas.slice(0, 3).map((m) => (
                <div key={m.rotulo} className="min-w-0 rounded-lg bg-muted/40 px-2 py-1.5">
                  <TextoTruncado as="dt" className="t-label truncate">
                    {m.rotulo}
                  </TextoTruncado>
                  <TextoTruncado as="dd" className="t-num-sm truncate font-medium">
                    {m.valor}
                  </TextoTruncado>
                </div>
              ))}
            </dl>
          ) : null}

          {resumo.amplitude && resumo.amplitude.total > 0 ? (
            <div
              role="img"
              aria-label={`${resumo.amplitude.emAlta} de ${resumo.amplitude.total} ativos em alta`}
              className="mt-bloco flex h-1.5 overflow-hidden rounded-full bg-muted"
            >
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
            <ul className="mt-bloco space-y-1 border-t border-border/60 pt-bloco">
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
              className="foco-visivel alvo-toque-linha t-caption mt-bloco inline-flex items-center self-start rounded-md font-medium text-primary underline-offset-4 hover:underline"
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
        <TextoTruncado className={`t-ticker block ${compacta ? "text-[0.8125rem]" : ""}`}>
          {linha.ticker}
        </TextoTruncado>
        <TextoTruncado className="t-subtexto block">{linha.nome}</TextoTruncado>
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
        <span className={`${compacta ? "t-num-sm" : "t-num"} block`}>{linha.valor}</span>
        {linha.variacao !== null ? (
          <span className={`t-num-sm block ${corVar(linha.variacao)}`}>
            {fmtPercent(linha.variacao)}
          </span>
        ) : null}
      </span>
    </>
  );


  const base = compacta
    ? "alvo-toque-linha flex w-full items-center gap-2 rounded-md px-1 py-1 text-left"
    : "alvo-toque-linha flex w-full items-center gap-3 px-4 py-2 text-left";

  if (!aoDetalhar) return <div className={base}>{conteudo}</div>;

  return (
    <button
      type="button"
      onClick={() => aoDetalhar(linha)}
      aria-label={`Ver detalhes de ${linha.ticker}`}
      className={`${base} foco-visivel transition-colors hover:bg-primary/10`}
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
    return (
      <EstadoVazio
        compacto
        className="border-0"
        titulo="Sem dados disponíveis"
        descricao="Não há cotações para esta categoria no momento."
      />
    );
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

