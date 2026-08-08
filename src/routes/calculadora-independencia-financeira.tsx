import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme";
import ogImagem from "@/assets/og-calculadora.jpg.asset.json";
import { SITE_URL, urlAbsoluta } from "@/lib/seo";

const TITLE = "Calculadora de Independência Financeira | Viver de Renda em 15 Anos";
const DESCRIPTION =
  "Calculadora de independência financeira gratuita: descubra o patrimônio necessário para viver de renda pela regra dos 4% e em quantos anos você chega lá.";
const URL = urlAbsoluta("/calculadora-independencia-financeira");
const OG_IMAGE = `${SITE_URL}${ogImagem.url}`;

const faqs = [
  {
    q: "O que é a regra dos 4% (taxa segura de retirada)?",
    a: "A regra dos 4% diz que é possível retirar 4% do patrimônio no primeiro ano de aposentadoria e corrigir esse valor pela inflação nos anos seguintes com baixa probabilidade de o dinheiro acabar em 30 anos. Na prática, ela equivale a acumular 25 vezes o seu custo de vida anual.",
    },
  {
    q: "Como calcular o meu 'número' da independência financeira?",
    a: "Multiplique o seu custo de vida mensal por 12 e divida pela taxa segura de retirada. Com R$ 8.000 por mês e taxa de 4%, o número é (8.000 × 12) / 0,04 = R$ 2,4 milhões — exatamente 25 vezes o gasto anual.",
  },
  {
    q: "A regra dos 4% funciona no Brasil?",
    a: "Ela nasceu de estudos com o mercado americano. No Brasil, com juros reais historicamente mais altos, muitos investidores usam de 3,5% a 5%. Taxas menores exigem mais patrimônio e dão mais margem de segurança; taxas maiores antecipam a data, mas aumentam o risco de exaurir a carteira.",
  },
  {
    q: "Devo considerar a inflação no cálculo?",
    a: "Sim. A calculadora projeta com rentabilidade real (acima da inflação), então o patrimônio e a renda aparecem em poder de compra de hoje. Assim o alvo continua válido daqui a 10 ou 20 anos.",
  },
];

export const Route = createFileRoute("/calculadora-independencia-financeira")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Calculadora de independência financeira com a regra dos 4%",
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
          "@type": "WebApplication",
          name: "Calculadora de Independência Financeira",
          description: DESCRIPTION,
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "pt-BR",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
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
    ],
  }),
  component: CalculadoraIndependencia,
});

const brl = (v: number) =>
  Number.isFinite(v)
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : "—";

function CalculadoraIndependencia() {
  const [custoMensal, setCustoMensal] = useState(8000);
  const [patrimonio, setPatrimonio] = useState(50000);
  const [aporte, setAporte] = useState(3000);
  const [taxaRetirada, setTaxaRetirada] = useState(4);
  const [rentabilidadeReal, setRentabilidadeReal] = useState(6);

  const resultado = useMemo(() => {
    const alvo = taxaRetirada > 0 ? (custoMensal * 12) / (taxaRetirada / 100) : Infinity;
    const multiplo = taxaRetirada > 0 ? 100 / taxaRetirada : Infinity;
    const i = Math.pow(1 + rentabilidadeReal / 100, 1 / 12) - 1;

    let saldo = patrimonio;
    let meses = 0;
    const marcos: { ano: number; patrimonio: number; renda: number }[] = [];
    while (saldo < alvo && meses < 720) {
      saldo = saldo * (1 + i) + aporte;
      meses++;
      if (meses % 12 === 0) {
        marcos.push({
          ano: meses / 12,
          patrimonio: saldo,
          renda: (saldo * (taxaRetirada / 100)) / 12,
        });
      }
    }

    return {
      alvo,
      multiplo,
      atingiu: saldo >= alvo,
      anos: Math.floor(meses / 12),
      mesesRestantes: meses % 12,
      rendaAtual: (patrimonio * (taxaRetirada / 100)) / 12,
      progresso: alvo > 0 ? Math.min(100, (patrimonio / alvo) * 100) : 0,
      marcos: marcos.slice(0, 40),
    };
  }, [custoMensal, patrimonio, aporte, taxaRetirada, rentabilidadeReal]);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">Investidor em 15 Anos</span>
          </Link>
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

      <main id="conteudo" className="mx-auto max-w-5xl px-5 py-12">
        <p className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
          <Target className="size-3.5" /> Ferramenta gratuita
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl">
          Calculadora de independência financeira
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Descubra o patrimônio necessário para viver de renda aplicando a regra dos 4% e veja em
          quantos anos os seus aportes chegam lá — em valores de hoje, já descontada a inflação.
        </p>

        <section className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Dados da simulação"
          >
            <div className="space-y-1.5">
              <Label htmlFor="custo">Custo de vida mensal (R$)</Label>
              <Input
                id="custo"
                type="number"
                min={0}
                step={500}
                value={custoMensal}
                onChange={(e) => setCustoMensal(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patrimonio">Patrimônio investido hoje (R$)</Label>
              <Input
                id="patrimonio"
                type="number"
                min={0}
                step={1000}
                value={patrimonio}
                onChange={(e) => setPatrimonio(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aporte-if">Aporte mensal (R$)</Label>
              <Input
                id="aporte-if"
                type="number"
                min={0}
                step={500}
                value={aporte}
                onChange={(e) => setAporte(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retirada">Taxa segura de retirada (% ao ano)</Label>
              <Input
                id="retirada"
                type="number"
                min={2}
                max={10}
                step={0.25}
                value={taxaRetirada}
                onChange={(e) =>
                  setTaxaRetirada(Math.min(10, Math.max(0.5, Number(e.target.value) || 4)))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rent-real">Rentabilidade real (% ao ano, acima da inflação)</Label>
              <Input
                id="rent-real"
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={rentabilidadeReal}
                onChange={(e) => setRentabilidadeReal(Number(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Patrimônio necessário ={" "}
              <span className="font-medium text-foreground">
                (custo mensal × 12) ÷ taxa de retirada
              </span>
              .
            </p>
          </form>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi rotulo="Seu número da liberdade" valor={brl(resultado.alvo)} destaque />
              <Kpi
                rotulo="Múltiplo do gasto anual"
                valor={
                  Number.isFinite(resultado.multiplo) ? `${resultado.multiplo.toFixed(0)}×` : "—"
                }
              />
              <Kpi
                rotulo="Tempo até a independência"
                valor={
                  resultado.atingiu
                    ? resultado.anos === 0 && resultado.mesesRestantes === 0
                      ? "Já atingido"
                      : `${resultado.anos} anos e ${resultado.mesesRestantes} meses`
                    : "Mais de 60 anos"
                }
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Progresso atual</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sua renda passiva hoje seria de {brl(resultado.rendaAtual)} por mês.
                  </p>
                </div>
                <p className="font-display text-xl font-semibold text-primary">
                  {resultado.progresso.toFixed(1)}%
                </p>
              </div>
              <div
                className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(resultado.progresso)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso rumo à independência financeira"
              >
                <div
                  className="h-full rounded-full bg-gradient-brand"
                  style={{ width: `${resultado.progresso}%` }}
                />
              </div>
            </div>

            {resultado.marcos.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Evolução anual do patrimônio até a independência financeira
                  </caption>
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left">
                        Ano
                      </th>
                      <th scope="col" className="px-4 py-2 text-right">
                        Patrimônio
                      </th>
                      <th scope="col" className="px-4 py-2 text-right">
                        Renda passiva/mês
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.marcos.map((m) => (
                      <tr key={m.ano} className="border-t border-border">
                        <td className="px-4 py-2">{m.ano}</td>
                        <td className="px-4 py-2 text-right font-medium">{brl(m.patrimonio)}</td>
                        <td className="px-4 py-2 text-right text-primary">{brl(m.renda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-semibold">A matemática por trás do seu “número”</h2>
          <p className="mt-4 text-muted-foreground">
            Independência financeira é o ponto em que a renda gerada pelos seus investimentos cobre
            o seu custo de vida. O cálculo parte de uma taxa segura de retirada: o percentual do
            patrimônio que você pode consumir por ano sem consumir o principal em termos reais. Com
            4%, o alvo é 25 vezes o gasto anual; com 3,5%, sobe para cerca de 29 vezes; com 5%, cai
            para 20 vezes.
          </p>
          <p className="mt-4 text-muted-foreground">
            A segunda metade da conta é o tempo. Usando a rentabilidade real — o retorno acima da
            inflação — os aportes mensais compõem até cruzarem o alvo. Por isso três alavancas
            mudam a sua data: reduzir o custo de vida (que diminui o alvo em 25 vezes o corte),
            aumentar o aporte e manter a carteira investida por mais tempo.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Perguntas frequentes</h2>
          <dl className="mt-4 space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Do número à carteira real</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No painel Viver de Renda em 15 Anos você acompanha aportes, dividendos e o progresso
              rumo ao seu número mês a mês, com o planejador de independência financeira integrado à
              sua carteira.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth">
                  Criar conta gratuita <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Acessar o painel</Link>
              </Button>
            </div>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Continue com o{" "}
            <Link to="/guia-liberdade-financeira" className="text-primary underline">
              guia de liberdade financeira
            </Link>
            , a{" "}
            <Link to="/calculadora-juros-compostos" className="text-primary underline">
              calculadora de juros compostos
            </Link>{" "}
            e{" "}
            <Link to="/o-que-e-renda-passiva" className="text-primary underline">
              o que é renda passiva
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}

function Kpi({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-border p-4 ${destaque ? "bg-gradient-brand text-primary-foreground" : "bg-card"}`}
    >
      <p className={`text-xs ${destaque ? "opacity-80" : "text-muted-foreground"}`}>{rotulo}</p>
      <p className="mt-1 font-display text-xl font-semibold">{valor}</p>
    </div>
  );
}
