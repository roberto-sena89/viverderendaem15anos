import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Coins,
  DollarSign,
  LineChart,
  PieChart,
  Scale,
  Search,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import heroImg from "@/assets/hero-dashboard.jpg";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { TickerMercado } from "@/components/ticker-mercado";
import { painelB3 } from "@/lib/market.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investidor em 15 Anos — Cotações, Carteira e Renda Passiva" },
      {
        name: "description",
        content:
          "Pesquise ações, FIIs e ETFs da B3, acompanhe cotações ao vivo, controle sua carteira, dividendos e projete a sua independência financeira.",
      },
      {
        property: "og:title",
        content: "Investidor em 15 Anos — Cotações, Carteira e Renda Passiva",
      },
      {
        property: "og:description",
        content:
          "Cotações ao vivo da B3, rankings de ativos, controle de carteira, dividendos e planejador da liberdade financeira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://viverderendaem15.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15.lovable.app/" }],
  }),
  component: Landing,
});

const MAIS_BUSCADOS = ["PETR4", "VALE3", "ITUB4", "MXRF11", "BOVA11", "BTC"];

const RANKINGS = [
  {
    icon: Coins,
    titulo: "Maiores Dividend Yield",
    texto: "Ações e FIIs que mais distribuíram proventos nos últimos 12 meses.",
  },
  {
    icon: Building2,
    titulo: "Maiores FIIs",
    texto: "Fundos imobiliários por patrimônio, liquidez e renda mensal.",
  },
  {
    icon: TrendingUp,
    titulo: "Maiores Altas do Dia",
    texto: "Quem está puxando o Ibovespa no pregão de hoje.",
  },
  {
    icon: PieChart,
    titulo: "ETFs mais negociados",
    texto: "BOVA11, IVVB11, SMAL11 e outros índices de mercado.",
  },
];

const FERRAMENTAS = [
  { icon: Wallet, title: "Carteira consolidada", text: "Ações, FIIs, ETFs, Tesouro e renda fixa com preço médio, lucro e participação." },
  { icon: Coins, title: "Dividendos", text: "Calendário, histórico, yield on cost e projeção de renda passiva mensal." },
  { icon: LineChart, title: "Planejador FI", text: "Projeção ano a ano com inflação, aumento de aportes e três cenários." },
  { icon: Scale, title: "Rebalanceamento", text: "Semáforo de alocação comparando a carteira real com a estratégia ideal." },
  { icon: Target, title: "Metas", text: "Da reserva de emergência ao patrimônio-alvo, com prazo estimado." },
  { icon: BarChart3, title: "Estatísticas", text: "CAGR, drawdown, rentabilidade real e evolução patrimonial." },
];

function Landing() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const painelFn = useServerFn(painelB3);

  const painel = useQuery({
    queryKey: ["home", "painel-b3"],
    queryFn: () => painelFn(),
    refetchInterval: 120_000,
    retry: 1,
  });

  const irParaAtivo = (valor: string) => {
    const ativo = valor.trim().toUpperCase();
    if (!ativo) return;
    void navigate({ to: "/mercado", search: { ativo } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:flex sm:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
              15
            </span>
            <span className="truncate font-display text-sm font-semibold">
              Investidor <span className="text-primary">em 15 anos</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            <Link to="/mercado" className="transition-colors hover:text-foreground">Mercado</Link>
            <Link to="/carteira" className="transition-colors hover:text-foreground">Carteira</Link>
            <Link to="/dividendos" className="transition-colors hover:text-foreground">Dividendos</Link>
            <Link to="/planejador" className="transition-colors hover:text-foreground">Ferramentas</Link>
            <Link to="/guia-liberdade-financeira" className="transition-colors hover:text-foreground">Guia</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard">
                Minha carteira <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero de busca, no padrão de portais de mercado */}
        <section className="relative isolate overflow-hidden border-b border-border">
          <img
            src={heroImg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[image:var(--gradient-surface)] opacity-95" />
          <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:py-24">
            <h1 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
              Pesquise pelo ativo desejado para ter acesso a{" "}
              <span className="text-gradient-brand">cotação, fundamentos e gráficos</span>
            </h1>

            <form
              className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-[var(--shadow-lift)]"
              onSubmit={(e) => {
                e.preventDefault();
                irParaAtivo(busca);
              }}
              role="search"
            >
              <label htmlFor="busca-ativo" className="sr-only">
                Pesquise pelo ativo desejado
              </label>
              <Search className="ml-3 size-4 shrink-0 text-muted-foreground" />
              <input
                id="busca-ativo"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                maxLength={20}
                placeholder="Pesquise pelo ativo desejado"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-hidden placeholder:text-muted-foreground"
              />
              <Button type="submit" size="sm" className="shrink-0 rounded-full px-5">
                Pesquisar
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-muted-foreground">Mais buscados:</span>
              {MAIS_BUSCADOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => irParaAtivo(t)}
                  className="rounded-full border border-border bg-card px-3 py-1 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Fita de cotações em carrossel */}
        <TickerMercado />

        {/* Indicadores do mercado */}
        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(painel.data?.indices ?? []).map((i) => (
              <div key={i.simbolo} className="surface-card p-4">
                <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">{i.nome}</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {i.preco === null
                    ? "—"
                    : i.preco.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-xs font-medium tabular-nums ${
                    (i.variacaoPercent ?? 0) >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {i.variacaoPercent === null
                    ? "—"
                    : `${i.variacaoPercent >= 0 ? "+" : ""}${i.variacaoPercent
                        .toFixed(2)
                        .replace(".", ",")}%`}
                </p>
              </div>
            ))}
            {painel.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="surface-card p-4">
                    <div className="h-14 animate-pulse rounded-lg bg-muted" />
                  </div>
                ))
              : null}
          </div>

          {painel.data?.indicadores.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {painel.data.indicadores.map((ind) => (
                <span
                  key={ind.nome}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs tabular-nums"
                >
                  <DollarSign className="size-3 text-primary" />
                  {ind.nome}: {ind.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                  {ind.unidade}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* Rankings de ativos */}
        <section className="mx-auto max-w-6xl px-5 pb-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <h2 className="font-display text-2xl font-semibold">Rankings de ativos</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/mercado">
                Ver mercado <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RANKINGS.map(({ icon: Icon, titulo, texto }) => (
              <Link
                key={titulo}
                to="/mercado"
                className="surface-card group p-6 text-center transition-transform hover:-translate-y-1"
              >
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold">{titulo}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{texto}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Ferramentas da plataforma */}
        <section className="border-y border-border bg-sidebar/40 py-14">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-display text-2xl font-semibold">
              Tudo que um investidor de longo prazo precisa
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Da entrada do aporte à data estimada da sua independência financeira.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FERRAMENTAS.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="surface-card p-6 transition-transform hover:-translate-y-1"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="max-w-xl font-display text-2xl font-semibold sm:text-3xl">
              Sua independência financeira tem data. Descubra qual.
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/planejador">
                  Abrir o planejador <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/guia-liberdade-financeira">Ler o guia</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Investidor em 15 Anos · Conteúdo educacional, não é recomendação de investimento.
      </footer>
    </div>
  );
}
