import { Bookmark, BookmarkCheck, Clock, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { COR_CLASSE } from "@/lib/cores-ativos";
import { CLASSE_POS_FIXADO } from "@/lib/portfolio";
import { Skeleton } from "@/components/ui/skeleton";
import type { Noticia } from "@/lib/noticias.functions";

/* ------------------------------------------------------------------ *
 * Helpers visuais
 * ------------------------------------------------------------------ */

/** Uma cor fixa por categoria, reaproveitando a paleta das classes de ativos. */
export const COR_CATEGORIA_NOTICIA: Record<string, string> = {
  Mercados: "var(--color-chart-3)",
  Ações: COR_CLASSE["Ações"],
  "Renda Fixa": COR_CLASSE[CLASSE_POS_FIXADO],
  "Fundos Imobiliários": COR_CLASSE.FIIs,
  "Câmbio & Cripto": COR_CLASSE.Criptomoedas,
  Economia: "var(--color-chart-5)",
  Internacional: COR_CLASSE.Stocks,
  Empresas: COR_CLASSE["Fundos de Investimentos"],
};

export function tempoRelativo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return "";
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.round(horas / 24);
  if (dias <= 6) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function BadgeCategoria({
  categoria,
  className,
}: {
  categoria: string;
  className?: string;
}) {
  const cor = COR_CATEGORIA_NOTICIA[categoria] ?? "var(--color-muted-foreground)";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide uppercase",
        className,
      )}
      style={{ color: cor, backgroundColor: `color-mix(in oklab, ${cor} 16%, transparent)` }}
    >
      {categoria}
    </span>
  );
}

export function SeloUrgente() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wide text-warning-foreground uppercase">
      <Radio className="size-3" aria-hidden="true" /> Urgente
    </span>
  );
}

/** Monograma do veículo — dá transparência sobre a origem de cada manchete. */
export function MarcaFonte({ fonte, className }: { fonte: string; className?: string }) {
  const iniciais = fonte
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const matiz = [...fonte].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 12;
  const cor = `var(--color-chart-${matiz + 1})`;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded font-display text-[0.6rem] font-bold"
        style={{ color: cor, backgroundColor: `color-mix(in oklab, ${cor} 18%, transparent)` }}
      >
        {iniciais}
      </span>
      <span className="truncate text-xs font-semibold text-muted-foreground">{fonte}</span>
    </span>
  );
}

export function TickersMencionados({
  tickers,
  onTicker,
  className,
}: {
  tickers: string[];
  onTicker: (t: string) => void;
  className?: string;
}) {
  if (tickers.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {tickers.map((t) => (
        <button
          key={t}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTicker(t);
          }}
          aria-label={`Ver dados do ativo ${t}`}
          className="num rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[0.7rem] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          ${t}
        </button>
      ))}
    </span>
  );
}

function BotaoSalvar({ salva, onClick }: { salva: boolean; onClick: () => void }) {
  const Icone = salva ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={salva ? "Remover das notícias salvas" : "Salvar notícia"}
      aria-pressed={salva}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-muted",
        salva ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icone className="size-4" />
    </button>
  );
}

function Capa({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        aria-hidden="true"
        className={cn("bg-gradient-to-br from-muted to-muted/40", className)}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("size-full object-cover", className)}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

export interface PropsCartao {
  noticia: Noticia;
  salva: boolean;
  onAbrir: (n: Noticia) => void;
  onSalvar: (n: Noticia) => void;
  onTicker: (t: string) => void;
}

/** Manchete principal do momento. */
export function CartaoHero({ noticia, salva, onAbrir, onSalvar, onTicker }: PropsCartao) {
  return (
    <article className="panel group overflow-hidden">
      <button
        type="button"
        onClick={() => onAbrir(noticia)}
        className="block w-full text-left"
        aria-label={`Abrir notícia: ${noticia.titulo}`}
      >
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          <Capa
            src={noticia.imagem}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </button>
      <div className="flex flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {noticia.urgente ? <SeloUrgente /> : null}
          <BadgeCategoria categoria={noticia.categoria} />
          <MarcaFonte fonte={noticia.fonte} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {tempoRelativo(noticia.publicadoEm)}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <button type="button" onClick={() => onAbrir(noticia)} className="min-w-0 text-left">
            <h2 className="font-display text-xl leading-tight font-bold text-balance sm:text-2xl">
              {noticia.titulo}
            </h2>
          </button>
          <BotaoSalvar salva={salva} onClick={() => onSalvar(noticia)} />
        </div>
        {noticia.resumo ? (
          <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            {noticia.resumo}
          </p>
        ) : null}
        <TickersMencionados tickers={noticia.tickers} onTicker={onTicker} />
      </div>
    </article>
  );
}

/** Destaque médio (bloco secundário). */
export function CartaoMedio({ noticia, salva, onAbrir, onSalvar, onTicker }: PropsCartao) {
  return (
    <article className="panel group flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => onAbrir(noticia)}
        className="block w-full text-left"
        aria-label={`Abrir notícia: ${noticia.titulo}`}
      >
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <Capa
            src={noticia.imagem}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {noticia.urgente ? <SeloUrgente /> : null}
          <BadgeCategoria categoria={noticia.categoria} />
          <span className="text-xs text-muted-foreground">
            {tempoRelativo(noticia.publicadoEm)}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <button type="button" onClick={() => onAbrir(noticia)} className="min-w-0 text-left">
            <h3 className="line-clamp-3 font-display text-[0.98rem] leading-snug font-semibold">
              {noticia.titulo}
            </h3>
          </button>
          <BotaoSalvar salva={salva} onClick={() => onSalvar(noticia)} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <MarcaFonte fonte={noticia.fonte} />
          <TickersMencionados tickers={noticia.tickers.slice(0, 2)} onTicker={onTicker} />
        </div>
      </div>
    </article>
  );
}

/** Linha compacta do feed, no padrão de terminal financeiro. */
export function ItemFeed({ noticia, salva, onAbrir, onSalvar, onTicker }: PropsCartao) {
  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
      <button
        type="button"
        onClick={() => onAbrir(noticia)}
        aria-label={`Abrir notícia: ${noticia.titulo}`}
        className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-16"
      >
        <Capa src={noticia.imagem} alt="" className="size-full object-cover" />
      </button>

      <div className="min-w-0">
        <button type="button" onClick={() => onAbrir(noticia)} className="w-full text-left">
          <h3 className="line-clamp-2 text-[0.95rem] leading-snug font-semibold text-balance">
            {noticia.titulo}
          </h3>
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {noticia.urgente ? <SeloUrgente /> : null}
          <BadgeCategoria categoria={noticia.categoria} />
          <MarcaFonte fonte={noticia.fonte} />
          <span className="text-xs text-muted-foreground">
            · {tempoRelativo(noticia.publicadoEm)}
          </span>
          <TickersMencionados tickers={noticia.tickers.slice(0, 3)} onTicker={onTicker} />
        </div>
      </div>

      <BotaoSalvar salva={salva} onClick={() => onSalvar(noticia)} />
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Skeletons — mesmo formato dos cards, sem pulo de layout
 * ------------------------------------------------------------------ */

export function EsqueletoHero() {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[21/9]" />
      <div className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function EsqueletoMedio() {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function EsqueletoLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-3 py-3 sm:px-4">
          <Skeleton className="size-14 shrink-0 rounded-lg sm:size-16" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
