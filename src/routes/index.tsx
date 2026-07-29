import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LineChart, PiggyBank, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Viver de Renda em 15 Anos — Carteira, Dividendos e Independência";
const DESCRIPTION =
  "Controle a sua carteira de ações, FIIs e renda fixa, acompanhe dividendos, rebalanceie a alocação e projete em quantos anos você vive de renda.";
const URL = "https://viverderendaem15anos.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
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
              primaryImageOfPage: undefined,
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
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) navigate({ to: "/dashboard" });
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">VIVER DE RENDA EM 15 ANOS</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-14">
          <h1 className="font-display max-w-3xl text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
            Organize a sua carteira e descubra em quantos anos você vive de renda
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">{DESCRIPTION}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Começar agora <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/calculadora-juros-compostos">Calculadora de juros compostos</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {recursos.map((r) => (
            <article key={r.title} className="bg-card rounded-xl border p-5">
              <r.icon className="text-primary size-6" />
              <h2 className="mt-4 text-base font-semibold">{r.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{r.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Conteúdo gratuito</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            <li>
              <Link className="text-primary hover:underline" to="/guia-liberdade-financeira">
                Liberdade financeira: guia passo a passo
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/calculadora-juros-compostos">
                Calculadora de juros compostos com aportes mensais
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/blog/melhores-livros-financas">
                Melhores livros de finanças e investimentos
              </Link>
            </li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <dl className="mt-4 grid gap-4">
            {faq.map((f) => (
              <div key={f.q} className="bg-card rounded-xl border p-5">
                <dt className="text-base font-semibold">{f.q}</dt>
                <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

      </main>
    </div>
  );
}
