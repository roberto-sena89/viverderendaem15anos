import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LineChart, PiggyBank, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import logoIcone from "@/assets/logo-icone.webp";
import heroFundo from "@/assets/hero-mercado-fundo.webp";
import ogImagem from "@/assets/og-home.jpg.asset.json";

const TITLE = "Viver de Renda em 15 Anos — Carteira, Dividendos e Independência";
const OG_TITLE = "Viver de Renda em 15 Anos: carteira e dividendos";
const DESCRIPTION =
  "Controle a sua carteira de ações, FIIs e renda fixa, acompanhe dividendos, rebalanceie a alocação e projete em quantos anos você vive de renda.";
const URL = "https://viverderendaem15anos.lovable.app/";
const OG_IMAGE = `https://viverderendaem15anos.lovable.app${ogImagem.url}`;


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Painel escuro com gráfico de valorização e indicadores de patrimônio e dividendos",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: URL },
    ],


    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${URL}#organization`,
              name: "Viver de Renda em 15 Anos",
              url: URL,
              description:
                "Plataforma de controle de investimentos, dividendos e planejamento da independência financeira.",
            },
            {
              "@type": "WebSite",
              "@id": `${URL}#website`,
              name: "Viver de Renda em 15 Anos",
              url: URL,
              inLanguage: "pt-BR",
              description: DESCRIPTION,
              publisher: { "@id": `${URL}#organization` },
            },
            {
              "@type": "WebPage",
              "@id": URL,
              url: URL,
              name: TITLE,
              description: DESCRIPTION,
              inLanguage: "pt-BR",
              isPartOf: { "@id": `${URL}#website` },
              about: { "@id": `${URL}#organization` },
            },
            {
              "@type": "SoftwareApplication",
              "@id": `${URL}#app`,
              name: "Viver de Renda em 15 Anos",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              url: URL,
              inLanguage: "pt-BR",
              description: DESCRIPTION,
              featureList: recursos.map((r) => `${r.title}: ${r.body}`),
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "BRL",
              },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${URL}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: URL },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Calculadora de juros compostos",
                  item: `${URL}calculadora-juros-compostos`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Guia de liberdade financeira",
                  item: `${URL}guia-liberdade-financeira`,
                },
              ],
            },
            {
              "@type": "FAQPage",
              "@id": `${URL}#faq`,
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],

  }),
  component: HomePage,
});

const recursos = [
  {
    icon: PiggyBank,
    title: "Carteira consolidada",
    body: "Registre aportes de ações, FIIs, ETFs, renda fixa e cripto e acompanhe preço médio, lucro e patrimônio em um só lugar.",
  },
  {
    icon: LineChart,
    title: "Dividendos e rentabilidade",
    body: "Histórico de proventos, yield on cost e evolução do patrimônio ano a ano, comparados aos principais índices.",
  },
  {
    icon: Sparkles,
    title: "Rebalanceamento e IA",
    body: "Alocação-alvo por classe, sugestão de onde investir o próximo aporte e um assistente de IA com o contexto da sua carteira.",
  },
];

const numeros: { valor: string; label: string }[] = [
  { valor: "12+", label: "Classes de ativos suportadas" },
  { valor: "10 anos", label: "Histórico de cotações e proventos" },
  { valor: "IA", label: "Assistente com o contexto da sua carteira" },
  { valor: "R$ 0", label: "Para começar a usar hoje" },
];

const faq: { q: string; a: string }[] = [
  {
    q: "O que é viver de renda?",
    a: "É quando a renda gerada pelos seus investimentos (dividendos, juros e aluguéis) cobre o seu custo de vida, tornando o trabalho opcional.",
  },
  {
    q: "Quanto preciso investir por mês para viver de renda em 15 anos?",
    a: "Depende do seu custo de vida e da rentabilidade real da carteira. Use a calculadora de juros compostos para simular aportes mensais e prazos.",
  },
  {
    q: "A plataforma é gratuita?",
    a: "Sim. Você pode criar sua conta e controlar carteira, aportes e dividendos sem custo.",
  },
];


function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;
    // Carregamento tardio do cliente de autenticação: mantém o bundle crítico
    // da landing pequeno para o H1 (elemento LCP) pintar mais cedo.
    const ocioso: number =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(verificarSessao)
        : (setTimeout(verificarSessao, 200) as unknown as number);

    function verificarSessao() {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        if (!ativo) return;
        supabase.auth.getSession().then(({ data }) => {
          if (ativo && data.session) navigate({ to: "/dashboard" });
        });
      });
    }

    return () => {
      ativo = false;
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(ocioso);
      } else {
        clearTimeout(ocioso);
      }
    };
  }, [navigate]);

  return (
    <div className="bg-background min-h-dvh">
      <a href="#conteudo" className="link-pular">Pular para o conteúdo</a>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
          <Link
            to="/"
            className="border-border/50 bg-background/60 flex items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 backdrop-blur-md transition-colors hover:border-primary/40"
          >
            <img
              src={logoIcone}
              alt="Logo Viver de Renda em 15 Anos"
              width={40}
              height={40}
              className="size-9 shrink-0 rounded-full"
            />
            <span className="text-[0.7rem] leading-tight font-semibold tracking-wide uppercase sm:text-xs">
              Viver de Renda
              <br />
              em 15 Anos
            </span>
          </Link>
          <div className="border-border/50 bg-background/60 flex items-center gap-1 rounded-full border p-1 backdrop-blur-md">
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-full px-4">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <img
          src={heroFundo}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 size-full object-cover opacity-60 dark:opacity-45"
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />

        <div className="from-background via-background/90 to-background/50 absolute inset-0 -z-10 bg-gradient-to-r" />
        <div className="from-background absolute inset-0 -z-10 bg-gradient-to-t via-transparent to-transparent" />
        <div
          aria-hidden
          className="bg-primary/15 absolute -top-32 -left-24 -z-10 size-[28rem] rounded-full blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-5 pt-28 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
          <span className="border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold tracking-wide uppercase sm:text-xs">
            <Sparkles className="size-3.5 shrink-0" /> Carteira, dividendos e independência
          </span>
          <h1 className="font-display mt-6 max-w-3xl text-[clamp(2.15rem,7vw,4rem)] leading-[1.05] font-bold tracking-tight text-balance">
            Organize a sua carteira e descubra em quantos anos você{" "}
            <span className="text-gradient-brand">vive de renda</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed text-pretty sm:mt-6 sm:text-lg">
            {DESCRIPTION}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="rounded-full shadow-[var(--shadow-lift)]">
              <Link to="/auth">
                Começar agora <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-background/50 rounded-full backdrop-blur-sm">
              <Link to="/calculadora-juros-compostos">Calculadora de juros compostos</Link>
            </Button>
          </div>

          <dl className="border-border/60 mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-8 border-t pt-8 sm:mt-16 sm:grid-cols-4">
            {numeros.map((n) => (
              <div key={n.label} className="min-w-0">
                <dt className="text-primary font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {n.valor}
                </dt>
                <dd className="text-muted-foreground mt-1.5 text-xs leading-snug text-pretty">{n.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main id="conteudo" className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
        <section className="grid gap-4 pt-14 sm:grid-cols-3 sm:pt-20">
          {recursos.map((r) => (
            <article
              key={r.title}
              className="bg-card/70 border-border/60 group rounded-2xl border p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="bg-primary/10 text-primary ring-primary/15 inline-flex size-11 items-center justify-center rounded-xl ring-1">
                <r.icon className="size-5" />
              </span>
              <h2 className="font-display mt-5 text-lg font-semibold tracking-tight">{r.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">{r.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Conteúdo gratuito</h2>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            <li>
              <Link
                className="border-border/60 bg-card/50 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-card"
                to="/guia-liberdade-financeira"
              >
                <span className="min-w-0">Liberdade financeira: guia passo a passo</span>
                <ArrowRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            <li>
              <Link
                className="border-border/60 bg-card/50 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-card"
                to="/quanto-rende-1-milhao-por-mes"
              >
                <span className="min-w-0">Quanto rende 1 milhão por mês? Poupança x Tesouro Selic x FIIs</span>
                <ArrowRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            <li>
              <Link
                className="border-border/60 bg-card/50 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-card"
                to="/o-que-e-renda-passiva"
              >
                <span className="min-w-0">Renda passiva: o que é e quanto investir para viver de renda</span>
                <ArrowRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            <li>
              <Link
                className="border-border/60 bg-card/50 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-card"
                to="/calculadora-juros-compostos"
              >
                <span className="min-w-0">Calculadora de juros compostos com aportes mensais</span>
                <ArrowRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            <li>
              <Link
                className="border-border/60 bg-card/50 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-card"
                to="/blog/melhores-livros-financas"
              >
                <span className="min-w-0">Melhores livros de finanças e investimentos</span>
                <ArrowRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          </ul>
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <dl className="mt-5 grid gap-3">
            {faq.map((f) => (
              <div key={f.q} className="bg-card/60 border-border/60 rounded-2xl border p-5 sm:p-6">
                <dt className="font-display text-base font-semibold sm:text-lg">{f.q}</dt>
                <dd className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoIcone} alt="" aria-hidden width={32} height={32} className="size-8 shrink-0 rounded-lg" />
            <p className="text-muted-foreground text-xs leading-snug">
              <span className="text-foreground font-semibold">Viver de Renda em 15 Anos</span>
              <br />
              Conteúdo educacional. Não é recomendação de investimento.
            </p>
          </div>
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link className="text-muted-foreground hover:text-primary" to="/guia-liberdade-financeira">
              Guia
            </Link>
            <Link className="text-muted-foreground hover:text-primary" to="/calculadora-juros-compostos">
              Calculadora
            </Link>
            <Link className="text-muted-foreground hover:text-primary" to="/blog/melhores-livros-financas">
              Blog
            </Link>
            <Link className="text-muted-foreground hover:text-primary" to="/auth">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
