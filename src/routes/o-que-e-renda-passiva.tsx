import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme";

const TITLE = "Renda Passiva: O Que É, Como Funciona e Quanto Investir";
const OG_TITLE = "Renda passiva: o que é e quanto você precisa investir";
const DESCRIPTION =
  "O que é renda passiva, quais ativos geram renda mensal (FIIs, dividendos, Tesouro) e quanto você precisa investir para viver de renda. Com simulador.";
const URL = "https://viverderendaem15anos.lovable.app/o-que-e-renda-passiva";

const faqs = [
  {
    q: "O que é renda passiva?",
    a: "Renda passiva é o dinheiro que os seus ativos geram sem depender do seu trabalho diário: dividendos de ações, proventos de fundos imobiliários, juros de títulos de renda fixa e aluguéis. Você constrói o patrimônio uma vez e ele passa a pagar você periodicamente.",
  },
  {
    q: "Qual a diferença entre renda passiva e renda ativa?",
    a: "Renda ativa é a que exige a sua presença — salário, honorários, prestação de serviço. Se você para, ela para. A renda passiva continua entrando enquanto os ativos estiverem na sua carteira, o que a torna a base de qualquer plano de independência financeira.",
  },
  {
    q: "Quais investimentos geram renda passiva no Brasil?",
    a: "Os mais usados são fundos imobiliários (proventos mensais, hoje isentos de IR para pessoa física), ações pagadoras de dividendos, Tesouro Direto e CDBs com pagamento de juros, Fiagros, ETFs de renda e REITs no exterior.",
  },
  {
    q: "Quanto preciso investir para viver de renda?",
    a: "Uma referência prática é a taxa de retirada segura de 4% ao ano: multiplique o seu custo de vida mensal por 300. Para R$ 5.000 por mês, isso equivale a cerca de R$ 1,5 milhão investido de forma diversificada.",
  },
  {
    q: "Dá para começar com pouco dinheiro?",
    a: "Sim. Cotas de FIIs e ações custam poucas dezenas de reais e o Tesouro Direto aceita aportes a partir de cerca de R$ 30. O que define o resultado é a constância dos aportes e o reinvestimento dos proventos, não o valor inicial.",
  },
  {
    q: "Renda passiva paga imposto?",
    a: "Depende do ativo. Dividendos de ações e proventos de FIIs são hoje isentos de IR para pessoa física dentro das regras vigentes; juros de renda fixa sofrem IR regressivo de 22,5% a 15%, e JCP tem retenção de 15% na fonte.",
  },
];

export const Route = createFileRoute("/o-que-e-renda-passiva")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
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
          about: ["renda passiva", "viver de renda", "dividendos", "fundos imobiliários"],
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
              item: "https://viverderendaem15anos.lovable.app/",
            },
            { "@type": "ListItem", position: 2, name: "O que é renda passiva", item: URL },
          ],
        }),
      },
    ],
  }),
  component: RendaPassivaPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Classes de ativos que pagam renda recorrente, com yield anual estimado. */
const fontes = [
  {
    nome: "Fundos imobiliários (FIIs)",
    yield: 0.09,
    detalhe:
      "Pagam proventos mensais vindos de aluguéis ou de crédito imobiliário. Isentos de IR para pessoa física; as cotas oscilam e há risco de vacância.",
  },
  {
    nome: "Ações de dividendos",
    yield: 0.07,
    detalhe:
      "Yield inicial menor, mas empresas sólidas tendem a aumentar o dividendo ao longo dos anos, elevando o seu yield on cost.",
  },
  {
    nome: "Tesouro Selic / CDBs",
    yield: 0.105,
    detalhe:
      "Renda previsível e liquidez alta. O IR regressivo (22,5% a 15%) reduz o líquido, por isso serve melhor como reserva e estabilizador.",
  },
  {
    nome: "Tesouro IPCA+ com juros semestrais",
    yield: 0.065,
    detalhe:
      "Paga cupom a cada seis meses e corrige o principal pela inflação — o instrumento mais direto para proteger o poder de compra da renda.",
  },
  {
    nome: "Fiagros e ETFs de renda",
    yield: 0.1,
    detalhe:
      "Distribuições recorrentes ligadas ao agronegócio ou a carteiras de crédito. Boa diversificação, com liquidez e risco variando bastante por fundo.",
  },
  {
    nome: "REITs e ETFs no exterior",
    yield: 0.045,
    detalhe:
      "Renda em dólar, útil para diluir o risco Brasil. Há tributação na fonte nos EUA e variação cambial sobre o valor recebido.",
  },
];

function RendaPassivaPage() {
  const [custoMensal, setCustoMensal] = useState(5000);
  const [yieldAno, setYieldAno] = useState(8);

  const { patrimonioNecessario, patrimonio4 } = useMemo(() => {
    const taxa = Math.max(yieldAno, 0.1) / 100;
    return {
      patrimonioNecessario: (custoMensal * 12) / taxa,
      patrimonio4: custoMensal * 300,
    };
  }, [custoMensal, yieldAno]);

  return (
    <div className="bg-background min-h-dvh">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <header className="border-border bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-brand text-primary-foreground grid size-9 place-items-center rounded-xl">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">Investidor em 15 Anos</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">
                Entrar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-5 py-12">
        <article>
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            Renda passiva: o que é, quais ativos pagam e quanto você precisa investir
          </h1>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Renda passiva é o dinheiro que a sua carteira paga sem depender do seu trabalho:{" "}
            <strong className="text-foreground">dividendos, proventos de FIIs, juros e aluguéis</strong>. Quando
            essa renda cobre o seu custo de vida, você vive de renda. Abaixo você calcula de quanto precisa,
            compara as fontes de renda disponíveis no Brasil e vê como acompanhar isso mês a mês.
          </p>

          <section className="mt-10">
            <div className="bg-card rounded-xl border p-5">
              <h2 className="text-xl font-semibold tracking-tight">
                Quanto preciso investir para viver de renda?
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="custo" className="text-sm font-semibold">
                    Custo de vida mensal (R$)
                  </Label>
                  <Input
                    id="custo"
                    type="number"
                    min={500}
                    step={500}
                    value={custoMensal}
                    onChange={(e) => setCustoMensal(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="yield" className="text-sm font-semibold">
                    Yield anual da carteira (%)
                  </Label>
                  <Input
                    id="yield"
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    value={yieldAno}
                    onChange={(e) => setYieldAno(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-2"
                  />
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed">
                Para receber <strong>{brl(custoMensal)}</strong> por mês a um yield de {yieldAno}% ao ano, você
                precisa de aproximadamente{" "}
                <strong className="text-primary num text-lg">{brl(patrimonioNecessario)}</strong> investidos.
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Pela regra conservadora dos 4% ao ano — que já reserva parte do rendimento para repor a inflação —
                o patrimônio-alvo sobe para {brl(patrimonio4)}. Use o número maior como meta e o menor como
                cenário otimista.
              </p>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Onde a renda passiva é gerada</h2>
            <div className="mt-4 grid gap-3">
              {fontes.map((f) => (
                <div key={f.nome} className="bg-card rounded-xl border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold">{f.nome}</h3>
                    <p className="text-primary num text-lg font-bold">
                      {(f.yield * 100).toFixed(1)}%
                      <span className="text-muted-foreground ml-1 text-xs font-normal">ao ano (estimado)</span>
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.detalhe}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Renda estimada sobre {brl(100_000)}: {brl((100_000 * f.yield) / 12)} por mês.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Como construir a sua em 4 passos</h2>
            <ol className="text-muted-foreground mt-4 grid list-decimal gap-3 pl-5 text-sm leading-relaxed">
              <li>
                Descubra o seu número: custo de vida mensal × 300. É ele que define a meta, não um valor redondo
                de mercado.
              </li>
              <li>
                Defina uma alocação-alvo por classe (renda fixa, FIIs, ações, exterior) e cumpra-a com aportes
                mensais, sem tentar acertar o momento do mercado.
              </li>
              <li>
                Reinvista 100% dos proventos na fase de acumulação — é o reinvestimento, e não o yield, que
                encurta o prazo até a independência.
              </li>
              <li>
                Meça o yield on cost real recebido mês a mês e rebalanceie direcionando o próximo aporte para a
                classe abaixo do alvo.
              </li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Acompanhar minha renda passiva grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/calculadora-juros-compostos">Simular juros compostos com aportes</Link>
              </Button>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Perguntas frequentes</h2>
            <dl className="mt-4 grid gap-4">
              {faqs.map((f) => (
                <div key={f.q} className="bg-card rounded-xl border p-5">
                  <dt className="text-base font-semibold">{f.q}</dt>
                  <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Continue lendo</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              <li>
                <Link className="text-primary hover:underline" to="/quanto-rende-1-milhao-por-mes">
                  Quanto rende 1 milhão por mês?
                </Link>
              </li>
              <li>
                <Link className="text-primary hover:underline" to="/guia-liberdade-financeira">
                  Liberdade financeira: guia passo a passo
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
            Conteúdo educativo. Os yields citados são estimativas de mercado e variam com a Selic, a inflação e os
            proventos efetivamente distribuídos. Não é recomendação de investimento.
          </p>
        </article>
      </main>
    </div>
  );
}
