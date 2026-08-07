import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { FormularioNewsletter } from "@/components/formulario-newsletter";
import { CONTEUDO_POR_SLUG, CONTEUDOS, caminhoConteudo } from "@/lib/conteudo-publico";
import ogImagem from "@/assets/og-home.jpg.asset.json";

const SITE = "https://viverderendaem15anos.lovable.app";
const OG_IMAGE = `${SITE}${ogImagem.url}`;

export const Route = createFileRoute("/conteudo/$slug")({
  loader: ({ params }) => {
    const conteudo = CONTEUDO_POR_SLUG.get(params.slug);
    if (!conteudo) throw notFound();
    return conteudo;
  },
  head: ({ loaderData }) => {
    const conteudo = loaderData;
    if (!conteudo) return {};
    const url = `${SITE}${caminhoConteudo(conteudo.slug)}`;
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
            author: { "@type": "Organization", name: "Investidor em 15 Anos" },
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
                item: `${SITE}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Conteúdo",
                item: `${SITE}/#conteudo`,
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

function ConteudoPage() {
  const conteudo = Route.useLoaderData();
  const relacionados = CONTEUDOS.filter((c) => c.slug !== conteudo.slug).slice(0, 3);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">Investidor em 15 Anos</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/planejador">
                Entrar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-3xl px-5 py-12">
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

          <h1 className="mt-4 text-4xl leading-tight font-semibold">{conteudo.h1}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Atualizado em {dataCurta(conteudo.atualizadoEm)}
          </p>
          <p className="mt-5 text-lg text-muted-foreground">{conteudo.intro}</p>

          <section className="mt-10 space-y-10">
            {conteudo.secoes.map((secao) => (
              <div key={secao.titulo}>
                <h2 className="text-2xl font-semibold">{secao.titulo}</h2>
                {secao.paragrafos.map((p) => (
                  <p key={p.slice(0, 48)} className="mt-3 text-muted-foreground">
                    {p}
                  </p>
                ))}
                {secao.lista && (
                  <ul className="mt-4 space-y-3">
                    {secao.lista.map((item) => (
                      <li key={item.titulo} className="rounded-xl border border-border bg-card p-4">
                        <strong className="font-medium">{item.titulo}.</strong>{" "}
                        <span className="text-muted-foreground">{item.corpo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
            <div className="mt-4 space-y-6">
              {conteudo.faq.map((f) => (
                <div key={f.q}>
                  <h3 className="font-medium">{f.q}</h3>
                  <p className="mt-1 text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Calcule o seu plano em 15 anos</h2>
            <p className="mt-2 text-muted-foreground">
              Use a calculadora de juros compostos para simular o seu patrimônio e veja quantos anos
              faltam para a sua renda cobrir o seu custo de vida.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/calculadora-juros-compostos">
                  Abrir a calculadora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/guia-liberdade-financeira">Guia de liberdade financeira</Link>
              </Button>
            </div>
          </div>

          {relacionados.length > 0 && (
            <nav className="mt-12" aria-label="Mais conteúdo">
              <h2 className="text-xl font-semibold">Leia também</h2>
              <div className="mt-4 space-y-3">
                {relacionados.map((c) => (
                  <Link
                    key={c.slug}
                    to={caminhoConteudo(c.slug)}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
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

          <section className="mt-12 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Receba o guia "Viver de Renda em 15 Anos"</h2>
            <p className="mt-2 text-muted-foreground">
              Conteúdo gratuito sobre renda passiva, dividendos e independência financeira — sem
              spam, cancele quando quiser.
            </p>
            <FormularioNewsletter origem={`conteudo:${conteudo.slug}`} />
          </section>
        </article>
      </main>
    </div>
  );
}
