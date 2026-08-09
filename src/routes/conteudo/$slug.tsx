import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, BookOpen, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabecalhoPublico } from "@/components/cabecalho-publico";
import { RodapePublico } from "@/components/rodape-publico";
import { FormularioNewsletter } from "@/components/formulario-newsletter";
import { dadosVivosConteudo } from "@/lib/dados-vivos.functions";
import {
  CONTEUDO_POR_SLUG,
  caminhoConteudo,
  conteudosRelacionados,
  type ConteudoPublico,
} from "@/lib/conteudo-publico";
import { SITE_URL, urlAbsoluta } from "@/lib/seo";
import ogImagem from "@/assets/og-home.jpg.asset.json";

const OG_IMAGE = `${SITE_URL}${ogImagem.url}`;

export const Route = createFileRoute("/conteudo/$slug")({
  loader: async ({ params, context }): Promise<ConteudoPublico> => {
    const conteudo = CONTEUDO_POR_SLUG.get(params.slug);
    if (!conteudo) throw notFound();
    // Pré-busca os dividend yields atuais para os exemplos de renda passiva:
    // no SSR o HTML já sai com os números; nas navegações seguintes os dados
    // ficam quentes no queryClient.
    await context.queryClient.ensureQueryData({
      queryKey: ["dados-vivos-conteudo"],
      queryFn: () => dadosVivosConteudo(),
      staleTime: 60_000,
    });
    return conteudo;
  },
  head: ({ loaderData }) => {
    const conteudo = loaderData;
    if (!conteudo) return {};
    const url = urlAbsoluta(caminhoConteudo(conteudo.slug));
    return {
      meta: [
        { title: conteudo.titulo },
        { name: "description", content: conteudo.descricao },
        { property: "og:title", content: conteudo.titulo },
        { property: "og:description", content: conteudo.descricao },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: "Guia gratuito sobre renda passiva e viver de renda",
        },
        { property: "og:locale", content: "pt_BR" },
        { property: "og:site_name", content: "Viver de Renda em 15 Anos" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: conteudo.titulo },
        { name: "twitter:description", content: conteudo.descricao },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: conteudo.titulo,
            description: conteudo.descricao,
            mainEntityOfPage: url,
            inLanguage: "pt-BR",
            dateModified: conteudo.atualizadoEm,
            author: { "@type": "Organization", name: "Viver de Renda em 15 Anos" },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: conteudo.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Início",
                item: `${SITE_URL}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Conteúdo",
                item: `${SITE_URL}/#conteudo`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: conteudo.titulo,
                item: url,
              },
            ],
          }),
        },
      ],
    };
  },
  component: ConteudoPage,
});

const dataCurta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Renda mensal de um capital aplicado à taxa do DY informado (a.a.). */
const rendaMensal = (capital: number, dyPct: number) => (capital * (dyPct / 100)) / 12;

/** Capital necessário para gerar uma renda mensal alvo à taxa do DY. */
const capitalParaRenda = (alvoMensal: number, dyPct: number) => (alvoMensal * 12) / (dyPct / 100);

const formatarReais = (valor: number) => reais.format(valor);

/** Renda passiva de exemplo com dividend yields atuais do mercado. */
function BlocoRendaHoje() {
  const { data } = useQuery({
    queryKey: ["dados-vivos-conteudo"],
    queryFn: () => dadosVivosConteudo(),
    staleTime: 60_000,
  });
  const amostras = [
    { rotulo: "Ações de dividendos", dy: data?.dyAcoes },
    { rotulo: "FIIs (fundos imobiliários)", dy: data?.dyFiis },
  ].filter((a): a is { rotulo: string; dy: number } => typeof a.dy === "number" && a.dy > 0);

  if (amostras.length === 0) return null;

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-primary" />
        <h2 className="t-h2">Quanto rendem R$ 100 mil com os dividendos de hoje?</h2>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {amostras.map(({ rotulo, dy }) => (
          <div key={rotulo} className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatarReais(rendaMensal(100_000, dy))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              DY médio de {dy.toFixed(1)}% a.a. — para R$ 5 mil/mês, um patrimônio de{" "}
              <strong className="text-foreground">
                {formatarReais(capitalParaRenda(5_000, dy))}
              </strong>
              .
            </p>
          </div>
        ))}
      </div>
      {data?.atualizadoEm && (
        <p className="mt-4 text-xs text-muted-foreground">
          Dividend yields médios do mercado em {dataCurta(data.atualizadoEm)}. Rendimentos passados
          não garantem resultados futuros.
        </p>
      )}
    </section>
  );
}

function ConteudoPage() {
  const { slug } = Route.useParams();
  const conteudo = CONTEUDO_POR_SLUG.get(slug);
  if (!conteudo) return null;
  const relacionados = conteudosRelacionados(conteudo.slug, 4);
  const temMaisDaCategoria = relacionados.some((c) => c.categoria === conteudo.categoria);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <CabecalhoPublico />

      <main id="conteudo" className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <article>
          <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Início
            </Link>
            <span className="mx-1.5">/</span>
            <span>Conteúdo</span>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{conteudo.categoria}</span>
          </nav>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-[0.16em] text-primary uppercase">
            <BookOpen className="size-3.5" /> Conteúdo gratuito
          </p>
          <h1 className="text-h1-lg mt-4 text-balance">{conteudo.h1}</h1>
          <p className="mt-3 text-xs text-muted-foreground">
            Atualizado em {dataCurta(conteudo.atualizadoEm)}
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            {conteudo.intro}
          </p>

          <BlocoRendaHoje />

          <section className="mt-10 space-y-10">
            {conteudo.secoes.map((secao) => (
              <div key={secao.titulo}>
                <h2 className="t-h2">{secao.titulo}</h2>
                {secao.paragrafos.map((p) => (
                  <p key={p.slice(0, 48)} className="mt-3 leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
                {secao.lista && (
                  <ul className="mt-4 space-y-3">
                    {secao.lista.map((item) => (
                      <li
                        key={item.titulo}
                        className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                      >
                        <strong className="font-medium">{item.titulo}.</strong>{" "}
                        <span className="text-muted-foreground">{item.corpo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="mt-14">
            <h2 className="t-h2">Perguntas frequentes</h2>
            <div className="mt-5 space-y-6">
              {conteudo.faq.map((f) => (
                <div key={f.q}>
                  <h3 className="t-h3">{f.q}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="t-h2">Calcule o seu plano em 15 anos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Use a calculadora de juros compostos para simular o seu patrimônio e veja quantos anos
              faltam para a sua renda cobrir o seu custo de vida.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-xl">
                <Link to="/calculadora-juros-compostos">
                  Abrir a calculadora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/guia-liberdade-financeira">Guia de liberdade financeira</Link>
              </Button>
            </div>
          </div>

          {relacionados.length > 0 && (
            <nav className="mt-12" aria-label="Mais conteúdo">
              <h2 className="t-h2">
                {temMaisDaCategoria ? `Mais sobre ${conteudo.categoria}` : "Leia também"}
              </h2>
              <div className="mt-4 space-y-3">
                {relacionados.map((c) => (
                  <Link
                    key={c.slug}
                    to={caminhoConteudo(c.slug)}
                    className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.categoria}
                    </span>
                    <span className="mt-1 block font-medium">{c.titulo}</span>
                  </Link>
                ))}
              </div>
            </nav>
          )}

          <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="t-h2">Receba o guia "Viver de Renda em 15 Anos"</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Conteúdo gratuito sobre renda passiva, dividendos e independência financeira — sem
              spam, cancele quando quiser.
            </p>
            <div className="mt-5">
              <FormularioNewsletter origem={`conteudo:${conteudo.slug}`} />
            </div>
          </section>
        </article>
      </main>
      <RodapePublico />
    </div>
  );
}
