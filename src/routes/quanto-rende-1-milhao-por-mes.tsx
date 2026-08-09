import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CabecalhoPublico } from "@/components/cabecalho-publico";
import { RodapePublico } from "@/components/rodape-publico";
import ogImagem from "@/assets/og-quanto-rende-1-milhao.jpg.asset.json";
import { SITE_URL, urlAbsoluta } from "@/lib/seo";

const TITLE = "Quanto Rende 1 Milhão por Mês? Poupança x Tesouro Selic x FIIs";
const OG_TITLE = "Quanto rende 1 milhão por mês? Veja a comparação";

const DESCRIPTION =
  "Quanto rende R$ 1 milhão por mês na poupança, no Tesouro Selic e em FIIs: compare a renda passiva líquida e a taxa de retirada segura.";
const URL = urlAbsoluta("/quanto-rende-1-milhao-por-mes");
const OG_IMAGE = `${SITE_URL}${ogImagem.url}`;

const faqs = [
  {
    q: "Quanto rende 1 milhão por mês na poupança?",
    a: "Com a Selic acima de 8,5% ao ano, a poupança rende 0,5% ao mês mais TR — cerca de R$ 5.000 por mês para R$ 1 milhão, isentos de Imposto de Renda. É a menor rentabilidade entre as alternativas conservadoras.",
  },
  {
    q: "Quanto rende 1 milhão no Tesouro Selic?",
    a: "A uma Selic de 10,5% ao ano, R$ 1 milhão rende aproximadamente R$ 8.360 por mês brutos. Descontando o IR (15% a 22,5% conforme o prazo) e a taxa de custódia da B3 (0,20% ao ano acima de R$ 10 mil), sobram cerca de R$ 6.900 líquidos por mês.",
  },
  {
    q: "Quanto rende 1 milhão em fundos imobiliários?",
    a: "Com um dividend yield médio de 9% ao ano, R$ 1 milhão em FIIs gera algo próximo de R$ 7.500 por mês em proventos, hoje isentos de IR para pessoa física — com a contrapartida da oscilação das cotas e do risco de vacância.",
  },
  {
    q: "Dá para viver de renda com 1 milhão?",
    a: "Depende do custo de vida. Usando uma taxa de retirada segura de 4% ao ano (o padrão para preservar o poder de compra), R$ 1 milhão sustenta cerca de R$ 3.300 por mês para sempre. O que exceder isso consome o principal ao longo do tempo, principalmente com a inflação.",
  },
  {
    q: "O que é renda passiva?",
    a: "É a renda gerada pelos seus investimentos — juros, dividendos e aluguéis — sem depender do seu trabalho. Quando ela cobre o seu custo de vida, você vive de renda.",
  },
];

export const Route = createFileRoute("/quanto-rende-1-milhao-por-mes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Comparativo do rendimento mensal de R$ 1 milhão em poupança, Tesouro Selic, CDB e FIIs",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          inLanguage: "pt-BR",
          mainEntityOfPage: URL,
          about: ["renda passiva", "quanto rende 1 milhão", "viver de renda"],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
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
              item: urlAbsoluta("/"),
            },
            { "@type": "ListItem", position: 2, name: "Quanto rende 1 milhão por mês", item: URL },
          ],
        }),
      },
    ],
  }),
  component: QuantoRendePage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Cenários de renda mensal por classe, com rendimento bruto e líquido estimados. */
const cenarios = [
  {
    nome: "Poupança",
    taxaAno: 0.0617,
    liquido: 1,
    detalhe: "0,5% ao mês + TR, isenta de IR. Rende menos que a inflação em vários anos.",
  },
  {
    nome: "Tesouro Selic / CDI",
    taxaAno: 0.105,
    liquido: 0.825,
    detalhe: "IR de 15% a 22,5% e custódia da B3 de 0,20% ao ano acima de R$ 10 mil.",
  },
  {
    nome: "CDB 110% do CDI",
    taxaAno: 0.1128,
    liquido: 0.825,
    detalhe: "Liquidez menor, garantia do FGC até R$ 250 mil por instituição.",
  },
  {
    nome: "FIIs (dividendos)",
    taxaAno: 0.09,
    liquido: 1,
    detalhe: "Proventos mensais isentos de IR para pessoa física; cotas oscilam.",
  },
  {
    nome: "Ações de dividendos",
    taxaAno: 0.07,
    liquido: 1,
    detalhe: "Yield menor no início, mas com potencial de crescer acima da inflação.",
  },
];

function QuantoRendePage() {
  const [capital, setCapital] = useState(1_000_000);

  const linhas = useMemo(
    () =>
      cenarios.map((c) => {
        const bruto = (capital * c.taxaAno) / 12;
        return { ...c, bruto, liq: bruto * c.liquido };
      }),
    [capital],
  );

  const retiradaSegura = (capital * 0.04) / 12;

  return (
    <div className="bg-background min-h-dvh">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <CabecalhoPublico />

      <main id="conteudo" className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <article>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Simulação e comparativos
          </p>
          <h1 className="t-h1 mt-4 max-w-3xl text-balance">
            Quanto rende 1 milhão por mês? Poupança, Tesouro Selic e FIIs comparados
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">
            A resposta curta: entre{" "}
            <strong className="text-foreground">R$ 5.000 e R$ 7.500 por mês</strong> líquidos,
            dependendo de onde o dinheiro está. A diferença entre a pior e a melhor alternativa
            passa de R$ 30 mil por ano — sobre o mesmo R$ 1 milhão. Abaixo você compara os cenários,
            ajusta o valor e entende qual parte dessa renda é realmente sustentável.
          </p>

          <section className="mt-10">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <Label htmlFor="capital" className="text-sm font-semibold">
                Valor investido
              </Label>
              <Input
                id="capital"
                type="number"
                min={1000}
                step={10000}
                value={capital}
                onChange={(e) => setCapital(Math.max(0, Number(e.target.value) || 0))}
                className="mt-2 max-w-xs"
              />
              <p className="text-muted-foreground mt-2 text-xs">
                Estimativas com Selic de 10,5% ao ano, CDI equivalente e yield médio de FIIs de 9%
                ao ano.
              </p>
            </div>

            <h2 className="t-h2 mt-10">Renda mensal de {brl(capital)} por tipo de investimento</h2>
            <div className="mt-4 grid gap-3">
              {linhas.map((l) => (
                <div
                  key={l.nome}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold">{l.nome}</h3>
                    <p className="text-primary num text-xl font-bold">
                      {brl(l.liq)}
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        /mês líquido
                      </span>
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Rendimento bruto de {brl(l.bruto)} por mês ({(l.taxaAno * 100).toFixed(2)}% ao
                    ano). {l.detalhe}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="t-h2">Quanto dá para retirar sem consumir o patrimônio</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
              Render não é o mesmo que poder gastar. Parte do rendimento precisa ser reinvestida só
              para repor a inflação — caso contrário, o seu R$ 1 milhão perde poder de compra ano
              após ano. A regra da taxa de retirada segura (4% ao ano) considera exatamente isso:
              com {brl(capital)}, a retirada perpétua estimada é de{" "}
              <strong className="text-foreground">{brl(retiradaSegura)} por mês</strong>, corrigida
              pela inflação.
            </p>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
              Ou seja: a poupança entrega uma renda nominal maior que a retirada segura, mas quase
              nada acima da inflação. Uma carteira diversificada — Tesouro IPCA+ para proteger o
              poder de compra, FIIs e ações de dividendos para a renda mensal, Tesouro Selic para a
              reserva — é o que permite retirar mais e continuar com o patrimônio de pé.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="t-h2">Como montar essa renda passiva na prática</h2>
            <ol className="text-muted-foreground mt-4 grid list-decimal gap-3 pl-5 text-sm leading-relaxed">
              <li>
                Defina o seu custo de vida mensal — é ele que determina de quanto você precisa, não
                o valor redondo de R$ 1 milhão.
              </li>
              <li>
                Escolha uma alocação-alvo por classe (renda fixa, FIIs, ações, exterior) e
                mantenha-a com aportes, não com vendas.
              </li>
              <li>
                Acompanhe o yield on cost real dos seus proventos, mês a mês, em vez de projeções
                otimistas de planilha.
              </li>
              <li>
                Rebalanceie quando uma classe se afastar da meta, direcionando o próximo aporte para
                o que está abaixo do alvo.
              </li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl">
                <Link to="/auth">
                  Montar minha carteira grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <Link to="/calculadora-juros-compostos">Simular até chegar ao 1º milhão</Link>
              </Button>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="t-h2">Perguntas frequentes</h2>
            <dl className="mt-4 grid gap-4">
              {faqs.map((f) => (
                <div
                  key={f.q}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <dt className="t-h3">{f.q}</dt>
                  <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14">
            <h2 className="t-h2">Continue lendo</h2>
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

          <p className="text-muted-foreground mt-10 text-xs leading-relaxed">
            Conteúdo educativo. As taxas usadas são estimativas de mercado e variam com a Selic, a
            inflação e os proventos efetivamente distribuídos. Não é recomendação de investimento.
          </p>
        </article>
      </main>
      <RodapePublico />
    </div>
  );
}
