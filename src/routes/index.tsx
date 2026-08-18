import { useEffect, useRef, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  LineChart,
  PiggyBank,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
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
import { cn } from "@/lib/utils";
import logoIcone from "@/assets/logo-icone.webp";
import heroFundo from "@/assets/hero-mercado-fundo.webp";
import ogImagem from "@/assets/og-home.jpg.asset.json";
import { MockupFrame } from "@/components/mockup-frame";
import { DashboardPreview } from "@/components/dashboard-preview";
import { NumeroAnimado } from "@/components/count-up";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

/* Referências de mercado ilustrativas para a fita de ativos da landing. */
const tickerItens: { sigla: string; valor: string; alta: boolean }[] = [
  { sigla: "IBOV", valor: "+0,72%", alta: true },
  { sigla: "PETR4", valor: "+2,41%", alta: true },
  { sigla: "HGLG11", valor: "−0,83%", alta: false },
  { sigla: "SELIC", valor: "10,50% a.a.", alta: true },
  { sigla: "IVVB11", valor: "+1,21%", alta: true },
  { sigla: "CDI", valor: "10,35% a.a.", alta: true },
  { sigla: "BOVA11", valor: "+0,68%", alta: true },
  { sigla: "BBDC4", valor: "+1,05%", alta: true },
  { sigla: "TAEE11", valor: "+0,42%", alta: true },
  { sigla: "VALE3", valor: "−1,12%", alta: false },
];

/** Revela o conteúdo com entrada suave quando entra na viewport. */
function Revelar({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Realce radial que acompanha o cursor do mouse (efeito spotlight). */
function CartaoSpotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn("cartao-spotlight", className)}
    >
      {children}
    </div>
  );
}

/** Botão magnético: aproxima suavemente do cursor (respeita reduced-motion). */
function BotaoMagnetico({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzido = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 20, mass: 0.6 });
  const y = useSpring(0, { stiffness: 220, damping: 20, mass: 0.6 });

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={reduzido ? undefined : { x, y }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.18);
        y.set((e.clientY - r.top - r.height / 2) * 0.24);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

function HomePage() {
  const navigate = useNavigate();

  // Fio de progresso de leitura no topo
  const { scrollYProgress } = useScroll();
  const progresso = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  // Parallax de saída do hero ao rolar
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], [0, 110]);

  // Parallax + tilt no mockup do dashboard
  const mockupRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: mockupProgress } = useScroll({
    target: mockupRef,
    offset: ["start end", "end start"],
  });
  const mockupY = useTransform(mockupProgress, [0, 1], [40, -40]);
  const mockupRotate = useTransform(mockupProgress, [0, 0.5, 1], [2, 0, -2]);
  const tiltX = useTransform(mockupProgress, [0, 0.5, 1], [7, 0, -7]);

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

      <motion.div
        aria-hidden
        style={{ scaleX: progresso }}
        className="bg-gradient-brand fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      />

      <header className="fixed inset-x-0 top-0 z-50 p-2 sm:top-4 sm:px-4">
        <div className="border-border/80 bg-background/80 mx-auto flex w-full max-w-3xl items-center justify-between gap-2 rounded-full border p-1.5 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:gap-3 sm:py-2 sm:pr-2 sm:pl-2">
          <Link
            to="/"
            aria-label="Viver de Renda em 15 Anos — página inicial"
            className="flex min-w-0 items-center gap-2 rounded-full pr-2 sm:gap-2.5 sm:pr-3"
          >
            <img
              src={logoIcone}
              alt="Logo Viver de Renda em 15 Anos"
              width={40}
              height={40}
              className="size-8 shrink-0 rounded-lg object-contain sm:size-9 sm:rounded-xl"
            />
            <span className="font-brand text-[0.7rem] leading-none font-bold text-foreground uppercase sm:text-sm sm:leading-[1.15]">
              Viver de Renda
              <br />
              <span className="text-[0.6rem] font-semibold tracking-[0.1em] text-muted-foreground sm:text-[0.68rem]">
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
              className="link-sublinhado text-muted-foreground hover:text-primary transition-colors"
            >
              Recursos
            </a>
            <a
              href="#conteudo-gratuito"
              className="link-sublinhado text-muted-foreground hover:text-primary transition-colors"
            >
              Conteúdo
            </a>
            <a
              href="#faq"
              className="link-sublinhado text-muted-foreground hover:text-primary transition-colors"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full px-3 text-[0.65rem] font-bold sm:h-9 sm:px-5 sm:text-xs"
            >
              <Link to="/auth">
                Entrar <ArrowRight className="size-3 sm:size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — manchete editorial com aurora, grade fina e grão */}
      <section ref={heroRef} className="grain relative isolate overflow-hidden">
        <img
          src={heroFundo}
          alt=""
          aria-hidden
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 size-full object-cover opacity-25 dark:opacity-20"
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />
        <div className="from-background via-background/80 to-background absolute inset-0 -z-10 bg-gradient-to-b" />
        <div
          aria-hidden
          className="aurora-blob -top-44 left-[6%] -z-10 h-[30rem] w-[30rem] bg-primary/25"
        />
        <div
          aria-hidden
          className="aurora-blob top-[8%] right-[4%] -z-10 h-[26rem] w-[26rem] bg-accent-warm/15"
          style={{ animationDelay: "-7s" }}
        />
        <div
          aria-hidden
          className="aurora-blob bottom-[-12rem] left-1/2 -z-10 h-[34rem] w-[60rem] -translate-x-1/2 bg-primary/15"
          style={{ animationDelay: "-14s" }}
        />
        <div aria-hidden className="grade-fina absolute inset-0 -z-10" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="mx-auto max-w-5xl px-5 pt-32 pb-16 text-center sm:px-6 sm:pt-44 sm:pb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span className="border-border/60 bg-card/80 text-accent-warm-strong inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.6rem] font-bold tracking-[0.15em] uppercase shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent-warm)_18%,transparent),0_10px_30px_-18px_color-mix(in_oklab,var(--color-accent-warm)_65%,transparent)] sm:px-4 sm:text-[0.7rem] sm:tracking-[0.2em]">
              <span
                className="bg-accent-warm size-1.5 animate-pulse rounded-full shadow-[0_0_12px_2px_color-mix(in_oklab,var(--color-accent-warm)_70%,transparent)] sm:size-2"
                aria-hidden
              />
              Carteira, dividendos e independência
            </span>
          </motion.div>

          <h1 className="mx-auto mt-6 max-w-5xl text-mega text-balance sm:mt-8 sm:text-giga">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.06, ease: EASE }}
            >
              Organize sua carteira e
            </motion.span>
            <motion.span
              className="text-gradient-brand mt-1 block text-balance"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
            >
              viva de renda em 15 anos
            </motion.span>
          </h1>

          <motion.p
            className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-pretty sm:mt-6 sm:text-lg"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28, ease: EASE }}
          >
            {DESCRIPTION}
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.38, ease: EASE }}
          >
            <BotaoMagnetico className="w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="botao-brilho w-full rounded-full px-9 font-bold shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                <Link to="/auth">
                  Começar agora <ArrowRight className="size-4" />
                </Link>
              </Button>
            </BotaoMagnetico>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-card/60 w-full rounded-full px-9 font-bold backdrop-blur-sm sm:w-auto"
            >
              <Link to="/calculadora-juros-compostos">Calculadora de juros compostos</Link>
            </Button>
          </motion.div>

          {/* Fita de referências de mercado */}
          <motion.div
            className="fita-pausa relative mt-14 overflow-hidden sm:mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          >
            <div
              aria-hidden
              className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r sm:w-32"
            />
            <div
              aria-hidden
              className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l sm:w-32"
            />
            <div className="fita-rolando flex w-max items-center gap-10 sm:gap-14">
              {[...tickerItens, ...tickerItens].map((item, i) => (
                <span
                  key={`${item.sigla}-${i}`}
                  className="flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-muted-foreground sm:text-xs"
                >
                  <span className="text-foreground/80">{item.sigla}</span>
                  <span
                    className={
                      item.alta ? "text-success tabular-nums" : "text-destructive tabular-nums"
                    }
                  >
                    {item.valor}
                  </span>
                </span>
              ))}
            </div>
          </motion.div>

          {/* Faixa de estatísticas */}
          <dl className="border-border/60 relative mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border/60 shadow-[var(--shadow-float)] sm:mt-10 sm:grid-cols-4 sm:rounded-3xl">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-primary/20 blur-3xl"
            />
            {numeros.map((n) => (
              <div
                key={n.label}
                className="bg-background/70 px-4 py-5 text-left backdrop-blur-md sm:px-6 sm:py-6"
              >
                <dt className="font-hero text-accent-warm-strong text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
                  <NumeroAnimado texto={n.valor} />
                </dt>
                <dd className="text-muted-foreground mt-1 text-[0.6rem] leading-tight font-semibold tracking-wide uppercase text-pretty sm:mt-1.5 sm:text-[0.68rem] sm:leading-snug">
                  {n.label}
                </dd>
              </div>
            ))}
          </dl>

          {/* Indicador de rolagem */}
          <motion.div
            className="mt-12 hidden justify-center sm:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <div
              className="flex h-10 w-6 items-start justify-center rounded-full border border-border p-1.5"
              aria-hidden
            >
              <motion.span
                className="bg-primary size-1.5 rounded-full"
                animate={{ y: [0, 14, 0], opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Mockup do Dashboard — showcase visual do produto */}
      <section className="relative py-12 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <Revelar>
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
          </Revelar>

          <div ref={mockupRef} className="relative mt-10 sm:mt-14" style={{ perspective: 1400 }}>
            <div
              aria-hidden
              className="absolute inset-x-8 -bottom-10 -z-10 h-24 rounded-full bg-primary/20 blur-3xl"
            />

            {/* Chips flutuantes em vidro */}
            <div
              aria-hidden
              className="flutuar-lento absolute top-16 -left-8 z-10 hidden w-44 rounded-2xl border border-border/70 bg-card/85 p-3.5 shadow-[var(--shadow-lift)] backdrop-blur-md lg:block"
            >
              <span className="text-muted-foreground block text-[0.55rem] font-bold tracking-[0.18em] uppercase">
                Patrimônio
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-sm font-bold tabular-nums">
                <Wallet className="text-primary size-3.5" />
                R$ 847.350
              </span>
            </div>
            <div
              aria-hidden
              className="flutuar-lento absolute top-44 -right-8 z-10 hidden w-40 rounded-2xl border border-border/70 bg-card/85 p-3.5 shadow-[var(--shadow-lift)] backdrop-blur-md lg:block"
              style={{ animationDelay: "-2.5s" }}
            >
              <span className="text-muted-foreground block text-[0.55rem] font-bold tracking-[0.18em] uppercase">
                Rentabilidade
              </span>
              <span className="text-success mt-1 flex items-center gap-1.5 text-sm font-bold tabular-nums">
                <TrendingUp className="size-3.5" />
                +12,4% a.a.
              </span>
            </div>
            <div
              aria-hidden
              className="flutuar-lento absolute -bottom-6 left-[18%] z-10 hidden w-44 rounded-2xl border border-border/70 bg-card/85 p-3.5 shadow-[var(--shadow-lift)] backdrop-blur-md lg:block"
              style={{ animationDelay: "-4.5s" }}
            >
              <span className="text-muted-foreground block text-[0.55rem] font-bold tracking-[0.18em] uppercase">
                Dividendos
              </span>
              <span className="text-accent-warm-strong mt-1 flex items-center gap-1.5 text-sm font-bold tabular-nums">
                <PiggyBank className="size-3.5" />
                8,4% a.a.
              </span>
            </div>

            <motion.div
              style={{
                y: mockupY,
                rotate: mockupRotate,
                rotateX: tiltX,
                transformPerspective: 1400,
              }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <MockupFrame className="mx-auto max-w-4xl">
                <DashboardPreview />
              </MockupFrame>
            </motion.div>
          </div>
        </div>
      </section>

      <main id="conteudo" className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
        <section id="recursos" className="grid gap-4 pt-10 sm:gap-5 sm:pt-16 md:grid-cols-3">
          {recursos.map((r, i) => (
            <Revelar key={r.title} delay={i * 0.08} className={i === 0 ? "md:col-span-2" : ""}>
              <CartaoSpotlight className="group border-border/60 bg-card relative h-full rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] sm:rounded-3xl sm:p-8">
                <span
                  aria-hidden
                  className="font-hero text-foreground/6 pointer-events-none absolute top-4 right-6 text-[4.5rem] leading-none font-extrabold tracking-tighter select-none"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="bg-primary/15 text-primary border-primary/30 relative z-10 inline-flex size-12 items-center justify-center rounded-xl border">
                  <r.icon className="size-5" />
                </span>
                <h2 className="font-hero relative z-10 mt-6 text-xl font-bold tracking-tight sm:text-2xl">
                  {r.title}
                </h2>
                <p className="text-muted-foreground relative z-10 mt-3 max-w-md text-sm leading-relaxed text-pretty">
                  {r.body}
                </p>
              </CartaoSpotlight>
            </Revelar>
          ))}

          <Revelar className="md:col-span-2">
            <section
              id="conteudo-gratuito"
              className="border-border/60 bg-card relative overflow-hidden rounded-2xl border p-6 sm:rounded-3xl sm:p-8"
            >
              <div
                aria-hidden
                className="bg-primary/10 absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
              />
              <h2 className="font-hero relative z-10 flex flex-wrap items-center gap-3 text-xl font-bold tracking-tight sm:text-2xl">
                Conteúdo gratuito
                <span className="bg-primary/10 text-primary rounded-md px-2 py-1 text-[0.6rem] font-bold tracking-widest uppercase">
                  Explore
                </span>
              </h2>
              <ul className="relative z-10 mt-7 grid gap-1">
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
                ].map((l, idx) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3.5 text-sm font-medium transition-all hover:border-border/60 hover:bg-muted/40"
                    >
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="font-hero text-foreground/30 group-hover:text-primary text-xs font-bold tracking-tight tabular-nums transition-colors">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">{l.label}</span>
                      </span>
                      <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </Revelar>

          {/* Como funciona */}
          <section className="mt-12 md:col-span-3 sm:mt-20">
            <Revelar>
              <h2 className="font-hero text-center text-2xl font-bold tracking-tight text-balance sm:text-4xl">
                Como funciona
              </h2>
              <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-pretty sm:text-base">
                Três passos do zero até a projeção da sua independência financeira.
              </p>
            </Revelar>
            <ol className="relative mt-8 grid items-stretch gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3">
              <div
                aria-hidden
                className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
              />
              {passos.map((p, i) => (
                <Revelar key={p.titulo} delay={i * 0.1}>
                  <li className="border-border/60 bg-card cartao-spotlight relative h-full rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] sm:rounded-3xl sm:p-7">
                    <span
                      aria-hidden
                      className="font-hero text-foreground/6 pointer-events-none absolute top-4 right-5 text-[4rem] leading-none font-extrabold tracking-tighter select-none"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="bg-primary/15 text-primary relative z-10 inline-flex size-12 items-center justify-center rounded-xl">
                      <p.icon className="size-5" />
                    </span>
                    <h3 className="font-hero relative z-10 mt-5 text-lg font-bold tracking-tight text-balance">
                      {p.titulo}
                    </h3>
                    <p className="text-muted-foreground relative z-10 mt-2 text-sm leading-relaxed text-pretty hyphens-auto">
                      {p.body}
                    </p>
                  </li>
                </Revelar>
              ))}
            </ol>
          </section>

          {/* CTA final */}
          <Revelar className="md:col-span-3">
            <aside className="relative isolate mt-12 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-card p-8 text-center shadow-[var(--shadow-lift)] sm:mt-20 sm:rounded-3xl sm:p-14">
              <div
                aria-hidden
                className="aurora-blob -top-28 left-1/2 h-72 w-[36rem] -translate-x-1/2 bg-primary/25"
              />
              <div
                aria-hidden
                className="aurora-blob -right-10 -bottom-32 h-60 w-80 bg-accent-warm/15"
                style={{ animationDelay: "-8s" }}
              />
              <p className="text-primary relative z-10 text-[0.62rem] font-bold tracking-[0.2em] uppercase">
                Comece hoje
              </p>
              <p className="font-hero text-accent-warm-strong relative z-10 mt-4 text-5xl font-extrabold tracking-tight tabular-nums sm:text-6xl">
                R$ 0
              </p>
              <p className="text-muted-foreground relative z-10 mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty">
                Crie sua conta e controle carteira, aportes e dividendos sem custo.
              </p>
              <BotaoMagnetico className="mt-8">
                <Button asChild size="lg" className="botao-brilho rounded-full px-9 font-bold">
                  <Link to="/auth">
                    Criar conta <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </BotaoMagnetico>
            </aside>
          </Revelar>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto mt-16 max-w-3xl sm:mt-24">
          <Revelar>
            <h2 className="font-hero text-center text-2xl font-bold tracking-tight sm:text-4xl">
              Perguntas frequentes
            </h2>
          </Revelar>
          <Revelar delay={0.1}>
            <Accordion
              type="single"
              collapsible
              className="border-border/60 bg-card mt-8 overflow-hidden rounded-2xl border shadow-[var(--shadow-soft)] sm:mt-10 sm:rounded-3xl"
            >
              {faq.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`faq-${i}`}
                  className="border-border/60 border-b px-4 last:border-b-0 sm:px-6"
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
          </Revelar>
        </section>

        {/* Newsletter */}
        <Revelar delay={0.1}>
          <section
            id="newsletter"
            className="relative isolate mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-card p-6 text-left sm:mt-24 sm:rounded-3xl sm:p-10"
          >
            <div
              aria-hidden
              className="aurora-blob -top-24 -right-24 h-60 w-60 bg-accent-warm/15"
              style={{ animationDelay: "-5s" }}
            />
            <div className="relative z-10">
              <p className="text-primary text-[0.62rem] font-bold tracking-[0.2em] uppercase">
                Conteúdo gratuito no seu e-mail
              </p>
              <h2 className="font-hero mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Receba o guia "Viver de Renda em 15 Anos"
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty">
                Dicas sobre renda passiva, dividendos e independência financeira, direto na sua
                caixa de entrada. Sem spam — cancele quando quiser.
              </p>
              <FormularioNewsletter origem="landing" />
            </div>
          </section>
        </Revelar>
      </main>

      <RodapePublico />
    </div>
  );
}
