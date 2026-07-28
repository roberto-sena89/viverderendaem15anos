import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Coins,
  LineChart,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import heroImg from "@/assets/hero-dashboard.jpg";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { brl } from "@/lib/portfolio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investidor em 15 Anos — Plataforma de Investimentos" },
      {
        name: "description",
        content:
          "Controle sua carteira, aportes e dividendos, simule sua aposentadoria e alcance a independência financeira com dados em tempo real.",
      },
      { property: "og:title", content: "Investidor em 15 Anos — Plataforma de Investimentos" },
      {
        property: "og:description",
        content:
          "Patrimônio, dividendos, rebalanceamento e planejador da independência financeira em uma plataforma premium.",
      },
      { property: "og:url", content: "https://viverderendaem15.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15.lovable.app/" }],
  }),
  component: Landing,
});

const features = [
  { icon: Wallet, title: "Carteira consolidada", text: "Ações, FIIs, ETFs, Tesouro e renda fixa em uma única visão com preço médio, lucro e participação." },
  { icon: Coins, title: "Dividendos sob controle", text: "Calendário, histórico, yield on cost e projeção de renda passiva mensal." },
  { icon: LineChart, title: "Planejador da independência", text: "Projeção ano a ano com inflação, aumento de aportes e cenários otimista, base e conservador." },
  { icon: Scale, title: "Rebalanceamento automático", text: "Semáforo de alocação comparando a carteira real com a estratégia ideal." },
  { icon: Target, title: "Metas patrimoniais", text: "Da reserva de emergência aos 3 milhões, com barras de progresso e prazo estimado." },
  { icon: BarChart3, title: "Estatísticas profissionais", text: "CAGR, drawdown, rentabilidade real e evolução patrimonial." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">Investidor em 15 Anos</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/dashboard">
                Entrar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[image:var(--gradient-surface)]" />
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-10 text-center lg:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Estratégia baseada em alocação por classes
          </span>
          <h1 className="animate-rise mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold sm:text-6xl">
            Construa hoje a <span className="text-gradient-brand">liberdade financeira</span> do seu
            futuro.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Controle seus investimentos, acompanhe sua evolução patrimonial e alcance a independência
            financeira.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">
                Começar agora <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/planejador">Conhecer a plataforma</Link>
            </Button>
          </div>

          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]">
            <img
              src={heroImg}
              alt="Dashboard de investimentos com gráficos de carteira, patrimônio e dividendos"
              width={1440}
              height={960}
              className="w-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { k: "Patrimônio acompanhado", v: brl(1200000) },
            { k: "Classes de ativos", v: "6" },
            { k: "Projeção ano a ano", v: "até 40 anos" },
          ].map((s) => (
            <div key={s.k} className="surface-card p-6 text-center">
              <p className="font-display text-2xl font-semibold">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase">{s.k}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">Tudo que um investidor de longo prazo precisa</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Da entrada do aporte à data estimada da sua independência financeira.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="surface-card p-6 transition-transform hover:-translate-y-1">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="max-w-xl text-2xl font-semibold sm:text-3xl">
            Sua independência financeira tem data. Descubra qual.
          </h2>
          <Button asChild size="lg">
            <Link to="/planejador">
              Abrir o planejador <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
      </main>


      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Investidor em 15 Anos · Conteúdo educacional, não é recomendação de investimento.
      </footer>
    </div>
  );
}
