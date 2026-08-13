import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CabecalhoPublico } from "@/components/cabecalho-publico";
import { RodapePublico } from "@/components/rodape-publico";
import ogImagem from "@/assets/og-calculadora.jpg.asset.json";
import { SITE_URL, urlAbsoluta } from "@/lib/seo";

const TITLE = "Calculadora de Juros Compostos | Simulador de Investimentos";
const DESCRIPTION =
  "Calculadora de juros compostos gratuita: informe capital inicial, aporte mensal, prazo e taxa de juros e veja a projeção do seu patrimônio com gráfico ano a ano.";
const URL = urlAbsoluta("/calculadora-juros-compostos");
const OG_IMAGE = `${SITE_URL}${ogImagem.url}`;

const faqs = [
  {
    q: "O que são juros compostos?",
    a: "Juros compostos são os juros que incidem sobre o capital inicial somado aos juros já acumulados em períodos anteriores. É o efeito 'juros sobre juros', responsável pela curva exponencial do patrimônio no longo prazo.",
  },
  {
    q: "Qual a fórmula dos juros compostos com aportes mensais?",
    a: "M = C × (1 + i)^n + A × [((1 + i)^n − 1) / i], onde C é o capital inicial, A o aporte mensal, i a taxa de juros do período e n o número de períodos. A calculadora acima aplica essa fórmula mês a mês.",
  },
  {
    q: "Como converter uma taxa anual para mensal?",
    a: "A conversão correta é composta: taxa mensal = (1 + taxa anual)^(1/12) − 1. Uma taxa de 12% ao ano equivale a aproximadamente 0,949% ao mês, e não a 1% ao mês.",
  },
  {
    q: "Quanto rende R$ 1.000 por mês em 15 anos?",
    a: "Com aportes de R$ 1.000 por mês durante 15 anos a 10% ao ano, o montante fica em torno de R$ 414 mil, sendo R$ 180 mil de aportes e o restante de juros compostos — o tempo é a variável mais poderosa da simulação.",
  },
];

export const Route = createFileRoute("/calculadora-juros-compostos")({
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
        content: "Calculadora de juros compostos com gráfico de crescimento do patrimônio",
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
          name: "Calculadora de Juros Compostos",
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
  component: CalculadoraPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function CalculadoraPage() {
  const [capital, setCapital] = useState(10000);
  const [aporte, setAporte] = useState(1000);
  const [anos, setAnos] = useState(15);
  const [taxaAno, setTaxaAno] = useState(10);

  const serie = useMemo(() => {
    const meses = Math.max(1, Math.round(anos * 12));
    const i = Math.pow(1 + taxaAno / 100, 1 / 12) - 1;
    let saldo = capital;
    let investido = capital;
    const pontos = [{ ano: 0, total: saldo, investido, juros: 0 }];
    for (let m = 1; m <= meses; m++) {
      saldo = saldo * (1 + i) + aporte;
      investido += aporte;
      if (m % 12 === 0 || m === meses) {
        pontos.push({
          ano: Math.round((m / 12) * 10) / 10,
          total: saldo,
          investido,
          juros: saldo - investido,
        });
      }
    }
    return pontos;
  }, [capital, aporte, anos, taxaAno]);

  const fim = serie[serie.length - 1];

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <CabecalhoPublico />

      <main id="conteudo" className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-[0.16em] text-primary uppercase">
          <Calculator className="size-3.5" /> Ferramenta gratuita
        </p>
        <h1 className="t-h1 mt-4 max-w-3xl text-balance">Calculadora de juros compostos</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Simule quanto o seu dinheiro rende com aportes mensais. Informe o capital inicial, o valor
          investido por mês, o prazo e a taxa de juros anual para ver a projeção do patrimônio ano a
          ano.
        </p>

        <section className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Dados da simulação"
          >
            <div className="space-y-1.5">
              <Label htmlFor="capital">Capital inicial (R$)</Label>
              <Input
                id="capital"
                type="number"
                min={0}
                step={100}
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aporte">Aporte mensal (R$)</Label>
              <Input
                id="aporte"
                type="number"
                min={0}
                step={100}
                value={aporte}
                onChange={(e) => setAporte(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anos">Prazo (anos)</Label>
              <Input
                id="anos"
                type="number"
                min={1}
                max={50}
                value={anos}
                onChange={(e) => setAnos(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxa">Taxa de juros (% ao ano)</Label>
              <Input
                id="taxa"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={taxaAno}
                onChange={(e) => setTaxaAno(Number(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A taxa anual é convertida para mensal de forma composta:{" "}
              <span className="font-medium text-foreground">(1 + i)^(1/12) − 1</span>.
            </p>
          </form>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi rotulo="Valor final" valor={brl(fim.total)} destaque />
              <Kpi rotulo="Total investido" valor={brl(fim.investido)} />
              <Kpi rotulo="Juros acumulados" valor={brl(fim.juros)} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Evolução do patrimônio</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serie}>
                    <defs>
                      <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="ano"
                      tickFormatter={(v) => `${v}a`}
                      fontSize={13}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      fontSize={13}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number, n) => [
                        brl(v),
                        n === "total" ? "Patrimônio" : "Investido",
                      ]}
                      labelFormatter={(l) => `Ano ${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="investido"
                      stroke="hsl(var(--muted-foreground))"
                      fill="transparent"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      fill="url(#grad-total)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Projeção ano a ano dos juros compostos</caption>
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left">
                      Ano
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      Investido
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      Juros
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      Patrimônio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {serie.slice(1).map((p) => (
                    <tr key={p.ano} className="border-t border-border">
                      <td className="px-4 py-2">{p.ano}</td>
                      <td className="px-4 py-2 text-right">{brl(p.investido)}</td>
                      <td className="px-4 py-2 text-right text-primary">{brl(p.juros)}</td>
                      <td className="px-4 py-2 text-right font-medium">{brl(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="t-h2">Como funcionam os juros compostos</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Nos juros compostos, o rendimento de cada mês passa a render também no mês seguinte. Por
            isso a curva do patrimônio é exponencial: nos primeiros anos o total investido domina o
            resultado, mas depois de uma década os juros acumulados costumam superar tudo o que você
            aportou. As três alavancas são simples — quanto você aporta, por quanto tempo e a que
            taxa —, e o tempo é a mais poderosa delas.
          </p>

          <h2 className="t-h2 mt-12">Perguntas frequentes</h2>
          <dl className="mt-5 space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="t-h3">{f.q}</dt>
                <dd className="mt-1.5 leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="t-h2">Da simulação para a carteira real</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Acompanhe aportes, dividendos, rentabilidade e metas da sua carteira de ações e FIIs
              em um só lugar.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link to="/auth">
                Criar conta gratuita <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Veja também o{" "}
            <Link to="/guia-liberdade-financeira" className="text-primary underline">
              guia de liberdade financeira
            </Link>
            .
          </p>
        </section>
      </main>
      <RodapePublico />
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
