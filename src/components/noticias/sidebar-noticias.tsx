import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Flame, Radar } from "lucide-react";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { agendaEconomica, type Noticia } from "@/lib/noticias.functions";
import { BadgeCategoria, MarcaFonte, tempoRelativo } from "./cartoes";

/* ------------------------------------------------------------------ *
 * Mais lidas do dia
 * ------------------------------------------------------------------ */

export function MaisLidas({
  noticias,
  leituras,
  onAbrir,
}: {
  noticias: Noticia[];
  leituras: Record<string, number>;
  onAbrir: (n: Noticia) => void;
}) {
  const ordenadas = [...noticias]
    .sort((a, b) => (leituras[b.id] ?? 0) - (leituras[a.id] ?? 0) || b.relevancia - a.relevancia)
    .slice(0, 5);

  return (
    <Panel title="Mais lidas do dia" bodyClassName="p-0">
      {ordenadas.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Sem leituras registradas hoje.</p>
      ) : (
        <ol className="divide-y divide-border">
          {ordenadas.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onAbrir(n)}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="num font-display text-lg leading-none font-bold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-sm leading-snug font-medium">
                    {n.titulo}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <MarcaFonte fonte={n.fonte} />
                    <span className="text-xs text-muted-foreground">
                      · {tempoRelativo(n.publicadoEm)}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Agenda econômica
 * ------------------------------------------------------------------ */

const COR_TIPO: Record<string, string> = {
  Brasil: "var(--color-chart-1)",
  EUA: "var(--color-chart-2)",
  Empresas: "var(--color-chart-5)",
};

export function AgendaEconomica() {
  const fn = useServerFn(agendaEconomica);
  const { data, isPending } = useQuery({
    queryKey: ["agenda-economica"],
    queryFn: () => fn({}),
    staleTime: 6 * 60 * 60 * 1000,
  });

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" /> Agenda econômica
        </span>
      }
      bodyClassName="p-0"
    >
      {isPending ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((e) => {
            const d = new Date(e.quando);
            return (
              <li
                key={e.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-center leading-none"
                  style={{
                    color: COR_TIPO[e.tipo],
                    backgroundColor: `color-mix(in oklab, ${COR_TIPO[e.tipo]} 14%, transparent)`,
                  }}
                >
                  <span className="num block text-sm font-bold">{d.getDate()}</span>
                  <span className="block text-[0.6rem] font-semibold uppercase">
                    {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{e.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.detalhe} ·{" "}
                    {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Radar da carteira
 * ------------------------------------------------------------------ */

export function RadarCarteira({
  noticias,
  onAbrir,
}: {
  noticias: Noticia[];
  onAbrir: (n: Noticia) => void;
}) {
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Radar className="size-4 text-primary" aria-hidden="true" /> Radar da carteira
        </span>
      }
      bodyClassName="p-0"
    >
      {noticias.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          Nenhuma notícia recente cita os ativos da sua carteira.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {noticias.slice(0, 6).map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onAbrir(n)}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="num mb-1 flex flex-wrap gap-1">
                  {n.tickers.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded bg-primary-soft px-1.5 py-0.5 text-[0.7rem] font-bold text-accent-foreground"
                    >
                      ${t}
                    </span>
                  ))}
                </span>
                <span className="line-clamp-2 block text-sm leading-snug font-medium">
                  {n.titulo}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {n.fonte} · {tempoRelativo(n.publicadoEm)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Glossário rápido
 * ------------------------------------------------------------------ */

const GLOSSARIO: { termo: string; definicao: string }[] = [
  { termo: "Copom", definicao: "Comitê do Banco Central que define a taxa Selic a cada 45 dias." },
  {
    termo: "Selic",
    definicao: "Taxa básica de juros da economia brasileira; referência da renda fixa pós-fixada.",
  },
  { termo: "IPCA", definicao: "Índice oficial de inflação do Brasil, calculado pelo IBGE." },
  {
    termo: "Dividend yield",
    definicao: "Proventos pagos nos últimos 12 meses divididos pelo preço da cota ou ação.",
  },
  {
    termo: "Payroll",
    definicao: "Relatório mensal de criação de empregos nos EUA; move juros e câmbio globais.",
  },
  {
    termo: "Guidance",
    definicao: "Projeção que a própria companhia divulga sobre seus resultados futuros.",
  },
  {
    termo: "Vacância",
    definicao: "Percentual de imóveis desocupados na carteira de um fundo imobiliário.",
  },
  {
    termo: "Circuit breaker",
    definicao: "Interrupção automática do pregão após queda brusca do índice.",
  },
];

export function TermosDefinicoes() {
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Flame className="size-4 text-primary" aria-hidden="true" /> Termos e definições
        </span>
      }
      hint="Passe o mouse ou toque para ver o significado"
    >
      <TooltipProvider delayDuration={150}>
        <ul className="flex flex-wrap gap-1.5">
          {GLOSSARIO.map((g) => (
            <li key={g.termo}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {g.termo}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">{g.definicao}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </TooltipProvider>
    </Panel>
  );
}

/** Bloco de notícias salvas para leitura posterior. */
export function NoticiasSalvas({
  salvas,
  onRemover,
}: {
  salvas: {
    id: string;
    titulo: string;
    url: string;
    fonte: string;
    categoria: string;
    publicadoEm: string;
  }[];
  onRemover: (id: string) => void;
}) {
  if (salvas.length === 0) return null;
  return (
    <Panel title="Notícias salvas" bodyClassName="p-0">
      <ul className="divide-y divide-border">
        {salvas.slice(0, 8).map((s) => (
          <li
            key={s.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-4 py-3"
          >
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 text-sm leading-snug font-medium hover:text-primary"
            >
              <span className="line-clamp-2 block">{s.titulo}</span>
              <span className="mt-1 flex items-center gap-2">
                <BadgeCategoria categoria={s.categoria} />
                <span className="text-xs text-muted-foreground">{s.fonte}</span>
              </span>
            </a>
            <button
              type="button"
              onClick={() => onRemover(s.id)}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
              aria-label={`Remover ${s.titulo} das salvas`}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
