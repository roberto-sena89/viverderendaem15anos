import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LineChart, PiggyBank, Sparkles, TrendingUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormularioNewsletter } from "@/components/formulario-newsletter";
import { RodapePublico } from "@/components/rodape-publico";
import { CONTEUDOS } from "@/lib/conteudo-publico";
import { SITE_URL, urlAbsoluta } from "@/lib/seo";
import logoIcone from "@/assets/logo-icone.webp";
import heroFundo from "@/assets/hero-mercado-fundo.webp";
import ogImagem from "@/assets/og-home.jpg.asset.json";
import { MockupFrame } from "@/components/mockup-frame";
import { DashboardPreview } from "@/components/dashboard-preview";
import { NumeroAnimado } from "@/components/count-up";
import { motion, useScroll, useTransform } from "motion/react";

const TITLE = "Viver de Renda em 15 Anos — Carteira, Dividendos e Independência";
const OG_TITLE = "Viver de Renda em 15 Anos: carteira e dividendos";
const DESCRIPTION =
  "Controle a sua carteira de ações, FIIs e renda fixa, acompanhe dividendos, rebalanceie a alocação e projete em quantos anos você vive de renda.";
const URL = urlAbsoluta("/");
const OG_IMAGE = `${SITE_URL}${ogImagem.url}`;

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
        content:
          "Painel escuro com gráfico de valorização e indicadores de patrimônio e dividendos",
      },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Viver de Renda em 15 Anos" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: OG_TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
      {
        name: "twitter:image:alt",
        content:
          "Painel escuro com gráfico de valorização e indicadores de patrimônio e dividendos",
      },
    ],
    links: [{ rel: "canonical", href: URL }],

    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
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
              itemListElement: [{ "@type": "ListItem", position: 1, name: "Início", item: URL }],
            },
            {
              "@type": "ItemList",
              "@id": `${URL}#conteudo`,
              name: "Conteúdo gratuito",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Calculadora de juros compostos",
                  url: `${URL}calculadora-juros-compostos`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Guia de liberdade financeira",
                  url: `${URL}guia-liberdade-financeira`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "O que é renda passiva",
                  url: `${URL}o-que-e-renda-passiva`,
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: "Quanto rende 100 mil por mês",
                  url: `${URL}conteudo/quanto-rende-100-mil-por-mes`,
                },
                {
                  "@type": "ListItem",
                  position: 5,
                  name: "Quanto preciso investir para viver de renda",
                  url: `${URL}conteudo/quanto-aportar-para-viver-de-renda`,
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

const passos: { icon: typeof PiggyBank; titulo: string; body: string }[] = [
  {
    icon: UserPlus,
    titulo: "Crie sua conta",
    body: "Em menos de um minuto e sem custo. Acesso autenticado e exclusivo aos seus dados.",
  },
  {
    icon: PiggyBank,
    titulo: "Registre sua carteira",
    body: "Adicione ações, FIIs, ETFs, renda fixa e cripto — ou comece sua primeira posição do zero.",
  },
  {
    icon: TrendingUp,
    titulo: "Projete sua independência",
    body: "Acompanhe dividendos e rentabilidade, rebalanceie a alocação e projete em quantos anos você vive de renda.",
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
  {
    q: "Preciso entender de investimentos para usar?",
    a: "Não. O painel mostra patrimônio, dividendos e rentabilidade em linguagem simples, e o assistente de IA explica cada indicador da sua carteira.",
  },
  {
    q: "Meus dados ficam protegidos?",
    a: "Sim. O acesso é autenticado e exclusivo da sua conta: só você vê a sua carteira, e as suas informações não são compartilhadas.",
  },
  {
    q: "O assistente de IA sabe o que eu tenho investido?",
    a: "Sim. Com o seu contexto carregado, ele responde sobre alocação, dividendos, rebalanceamento e onde aplicar o próximo aporte — sempre com foco no seu objetivo de renda.",
  },
];

function HomePage() {
  const navigate = useNavigate();

  // Parallax suave no mockup do dashboard
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const mockupRotate = useTransform(scrollYProgress, [0, 0.5, 1], [2, 0, -2]);

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
    <div className="bg-background text-foreground min-h-dvh overflow-x-hidden">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>

      <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-6">
        <div className="border-border/80 bg-background/80 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-2 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl">
          <Link
            to="/"
            aria-label="Viver de Renda em 15 Anos — página inicial"
            className="flex min-w-0 items-center gap-2.5 rounded-full pr-3"
          >
            <img
              src={logoIcone}
              alt="Logo Viver de Renda em 15 Anos"
              width={40}
              height={40}
              className="size-9 shrink-0 rounded-xl object-contain"
            />
            <span className="font-brand text-sm leading-[1.15] font-bold text-foreground uppercase">
              Viver de Renda
              <br />
              <span className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground">
                em 15 Anos
              </span>
            </span>
          </Link>
          <nav
            aria-label="Seções"
            className="hidden items-center gap-7 text-[0.68rem] font-semibold tracking-[0.18em] uppercase md:flex"
          >
            <a
              href="#recursos"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Recursos
            </a>
            <a
              href="#conteudo-gratuito"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Conteúdo
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-full px-5 text-xs font-bold">
              <Link to="/auth">
                Entrar <ArrowRight className="size-3.5" />
              </Link>
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
          className="absolute inset-0 -z-10 size-full object-cover opacity-35 dark:opacity-30"
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />
        <div className="from-background via-background/85 to-background absolute inset-0 -z-10 bg-gradient-to-b" />
        <div
          aria-hidden
          className="bg-primary/20 absolute -top-56 left-1/2 -z-10 h-[34rem] w-[64rem] -translate-x-1/2 rounded-full blur-[140px]"
        />

        <div className="mx-auto max-w-5xl px-5 pt-32 pb-16 text-center sm:px-6 sm:pt-44 sm:pb-24">
          <span className="border-primary/40 bg-card/80 text-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.65rem] font-bold tracking-[0.2em] uppercase shadow-inner sm:text-[0.7rem]">
            <span className="bg-primary size-2 animate-pulse rounded-full" aria-hidden />
            Carteira, dividendos e independência
          </span>

          <h1 className="font-hero mx-auto mt-8 max-w-4xl text-mega text-balance">
            Organize sua carteira e{" "}
            <span className="text-gradient-brand">viva de renda em 15 anos</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            {DESCRIPTION}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full rounded-xl px-8 font-bold shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              <Link to="/auth">
                Começar agora <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-card/60 w-full rounded-xl px-8 font-bold backdrop-blur-sm sm:w-auto"
            >
              <Link to="/calculadora-juros-compostos">Calculadora de juros compostos</Link>
            </Button>
          </div>

          <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:mt-20 sm:grid-cols-4 sm:gap-4">
            {numeros.map((n) => (
              <div
                key={n.label}
                className="border-border/60 bg-card/50 rounded-2xl border p-5 text-left backdrop-blur-sm transition-colors hover:border-primary/40"
              >
                <dt className="font-hero text-foreground text-2xl font-bold tracking-tight tabular-nums">
                  <NumeroAnimado texto={n.valor} />
                </dt>
                <dd className="text-muted-foreground mt-1.5 text-[0.68rem] leading-snug font-semibold tracking-wide uppercase text-pretty">
                  {n.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Mockup do Dashboard — showcase visual do produto */}
      <section className="relative py-12 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="text-center">
            <span className="border-primary/40 bg-card/80 text-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.65rem] font-bold tracking-[0.2em] uppercase shadow-inner">
              <span className="bg-primary size-2 rounded-full" />
              Interface real
            </span>
            <h2 className="font-hero mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Controle total do seu patrimônio
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-sm leading-relaxed text-pretty sm:text-base">
              Visualize sua evolução, acompanhe indicadores e receba insights para acelerar sua
              independência financeira.
            </p>
          </div>

          <div ref={mockupRef} className="mt-10 sm:mt-14" style={{ perspective: 1200 }}>
            <motion.div
              style={{ y: mockupY, rotate: mockupRotate }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <MockupFrame className="mx-auto max-w-4xl">
                <DashboardPreview />
              </MockupFrame>
            </motion.div>
          </div>
        </div>
      </section>

      <main id="conteudo" className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
        <section id="recursos" className="grid gap-4 pt-10 sm:pt-16 md:grid-cols-3">
          {recursos.map((r, i) => (
            <article
              key={r.title}
              className={`group border-border/60 relative overflow-hidden rounded-3xl border p-8 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] ${
                i === 0 ? "from-card to-background bg-gradient-to-br md:col-span-2" : "bg-card"
              }`}
            >
              <div className="relative z-10">
                <span className="bg-primary/15 text-primary border-primary/30 inline-flex size-12 items-center justify-center rounded-xl border">
                  <r.icon className="size-5" />
                </span>
                <h2 className="font-hero mt-6 text-xl font-bold tracking-tight sm:text-2xl">
                  {r.title}
                </h2>
                <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed text-pretty">
                  {r.body}
                </p>
              </div>
              <div
                aria-hidden
                className="bg-primary/10 group-hover:bg-primary/20 pointer-events-none absolute -right-12 -bottom-12 size-64 rounded-full blur-3xl transition-colors"
              />
            </article>
          ))}

          <section
            id="conteudo-gratuito"
            className="border-border/60 bg-card rounded-3xl border p-8 md:col-span-2"
          >
            <h2 className="font-hero flex flex-wrap items-center gap-3 text-xl font-bold tracking-tight sm:text-2xl">
              Conteúdo gratuito
              <span className="bg-primary/10 text-primary rounded-md px-2 py-1 text-[0.6rem] font-bold tracking-widest uppercase">
                Explore
              </span>
            </h2>
            <ul className="mt-7 grid gap-2">
              {[
                {
                  to: "/guia-liberdade-financeira",
                  label: "Liberdade financeira: guia passo a passo",
                },
                {
                  to: "/quanto-rende-1-milhao-por-mes",
                  label: "Quanto rende 1 milhão por mês? Poupança x Tesouro Selic x FIIs",
                },
                {
                  to: "/o-que-e-renda-passiva",
                  label: "Renda passiva: o que é e quanto investir para viver de renda",
                },
                {
                  to: "/calculadora-juros-compostos",
                  label: "Calculadora de juros compostos com aportes mensais",
                },
                {
                  to: "/blog/melhores-livros-financas",
                  label: "Melhores livros de finanças e investimentos",
                },
                ...CONTEUDOS.slice(0, 6).map((c) => ({
                  to: `/conteudo/${c.slug}`,
                  label: c.titulo,
                })),
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="group hover:bg-muted/40 hover:border-border/60 flex items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3.5 text-sm font-medium transition-all"
                  >
                    <span className="min-w-0">{l.label}</span>
                    <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 md:col-span-3 sm:mt-20">
            <h2 className="font-hero text-center text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              Como funciona
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-pretty sm:text-base">
              Três passos do zero até a projeção da sua independência financeira.
            </p>
            <ol className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3">
              {passos.map((p, i) => (
                <li
                  key={p.titulo}
                  className="border-border/60 bg-card relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
                >
                  <span
                    aria-hidden
                    className="font-hero text-foreground/8 pointer-events-none absolute -top-3 -right-1 text-[5rem] leading-none font-extrabold tracking-tighter select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="bg-primary/15 text-primary inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
                    <p.icon className="size-5" />
                  </span>
                  <h3 className="font-hero mt-5 text-lg font-bold tracking-tight text-balance">
                    {p.titulo}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty hyphens-auto">
                    {p.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>


          <aside className="border-primary/30 from-primary/20 to-card relative flex flex-col items-start gap-6 overflow-hidden rounded-3xl border bg-gradient-to-br p-8 md:col-span-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-primary text-[0.62rem] font-bold tracking-[0.2em] uppercase">
                Comece hoje
              </p>
              <p className="font-hero mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                R$ 0
              </p>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed text-pretty">
                Crie sua conta e controle carteira, aportes e dividendos sem custo.
              </p>
            </div>
            <Button asChild size="lg" className="w-full rounded-xl px-8 font-bold md:w-auto">
              <Link to="/auth">
                Criar conta <ArrowRight className="size-4" />
              </Link>
            </Button>
          </aside>
        </section>

        <section id="faq" className="mx-auto mt-16 max-w-3xl sm:mt-24">
          <h2 className="font-hero text-center text-2xl font-bold tracking-tight sm:text-4xl">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="mt-10 grid gap-3">
            {faq.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`faq-${i}`}
                className="border-border/60 bg-card rounded-2xl border px-6"
              >
                <AccordionTrigger className="font-hero py-5 text-left text-base font-bold tracking-tight hover:no-underline sm:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 text-sm leading-relaxed text-pretty">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section
          id="newsletter"
          className="border-primary/30 from-primary/15 to-card mx-auto mt-16 max-w-3xl rounded-3xl border bg-gradient-to-br p-8 text-left sm:mt-24 sm:p-10"
        >
          <p className="text-primary text-[0.62rem] font-bold tracking-[0.2em] uppercase">
            Conteúdo gratuito no seu e-mail
          </p>
          <h2 className="font-hero mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Receba o guia "Viver de Renda em 15 Anos"
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty">
            Dicas sobre renda passiva, dividendos e independência financeira, direto na sua caixa de
            entrada. Sem spam — cancele quando quiser.
          </p>
          <FormularioNewsletter origem="landing" />
        </section>
      </main>

      <RodapePublico />
    </div>
  );
}
