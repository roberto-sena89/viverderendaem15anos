import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";

const TITLE = "Liberdade Financeira: Guia Passo a Passo (2026)";
const DESCRIPTION =
  "Guia de liberdade financeira: quanto acumular, alocação de ativos, renda passiva com dividendos e o passo a passo para viver de renda.";
const URL = "https://viverderendaem15anos.lovable.app/guia-liberdade-financeira";

export const Route = createFileRoute("/guia-liberdade-financeira")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
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
          mainEntityOfPage: URL,
          inLanguage: "pt-BR",
          author: { "@type": "Organization", name: "Investidor em 15 Anos" },
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
  component: GuiaPage,
});

const steps = [
  {
    title: "1. Defina o seu número da independência financeira",
    body: "Liberdade financeira é quando a renda dos seus investimentos cobre o seu custo de vida. Some todos os gastos anuais e multiplique por 25 (regra dos 4% de retirada). Custo de vida de R$ 8.000 por mês significa R$ 96.000 por ano e um patrimônio-alvo de R$ 2,4 milhões. Se você pretende viver só de dividendos líquidos, use um yield real conservador de 4% a 5% ao ano.",
  },
  {
    title: "2. Monte a reserva de emergência antes de investir em risco",
    body: "De 6 a 12 meses de despesas em liquidez diária (Tesouro Selic ou renda fixa pós-fixada com resgate imediato). Essa reserva é o que impede você de vender ações e FIIs no pior momento do ciclo — o maior destruidor silencioso de patrimônio de longo prazo.",
  },
  {
    title: "3. Transforme a taxa de poupança no seu principal motor",
    body: "Nos primeiros anos, o aporte mensal pesa muito mais que a rentabilidade. Quem guarda 30% da renda chega à independência financeira em cerca de metade do tempo de quem guarda 15%, com o mesmo retorno. Automatize o aporte no dia do salário e trate-o como uma conta obrigatória.",
  },
  {
    title: "4. Defina a alocação de ativos por classe — e só depois escolha os ativos",
    body: "A alocação explica a maior parte da variação de resultado de uma carteira de longo prazo. Um esqueleto comum no Brasil: renda fixa (Tesouro IPCA+ e CDBs) para estabilidade, ações para crescimento, FIIs para renda mensal, ETFs internacionais para diversificação cambial. Escreva os percentuais-alvo antes de comprar qualquer ativo.",
  },
  {
    title: "5. Construa renda passiva com dividendos e aluguéis de FIIs",
    body: "Reinvista 100% dos proventos durante a fase de acumulação: é isso que gera juros compostos sobre a renda. Acompanhe o yield on cost (dividendo anual dividido pelo preço médio pago) — é ele, e não o dividend yield atual, que mostra a renda passiva real que a sua carteira já construiu.",
  },
  {
    title: "6. Rebalanceie uma ou duas vezes por ano",
    body: "Quando uma classe passa da meta em mais de 5 pontos percentuais, direcione os novos aportes para a classe atrasada em vez de vender (evita imposto e custos). Rebalancear é o que mantém o risco sob controle e faz você comprar barato de forma sistemática.",
  },
  {
    title: "7. Meça a evolução em anos, não em meses",
    body: "Acompanhe patrimônio total, rentabilidade real (acima do IPCA), CAGR, renda passiva mensal e o percentual do custo de vida já coberto pelos investimentos. Esse último indicador é o verdadeiro placar da liberdade financeira.",
  },
];

const faqs = [
  {
    q: "Qual a diferença entre liberdade financeira e independência financeira?",
    a: "Independência financeira é o ponto matemático em que a renda dos investimentos cobre 100% das suas despesas. Liberdade financeira é o efeito prático: poder escolher trabalhar, mudar de carreira ou parar, sem que a decisão dependa do salário.",
  },
  {
    q: "Quanto preciso para viver de renda no Brasil?",
    a: "Use o custo de vida anual multiplicado por 25 como referência. Para uma renda de R$ 5.000 por mês, o alvo fica em torno de R$ 1,5 milhão investido, considerando retirada segura de 4% ao ano.",
  },
  {
    q: "Dá para alcançar a liberdade financeira em 15 anos?",
    a: "Sim, para quem mantém uma taxa de poupança alta (acima de 30% da renda), aportes crescentes com a inflação e uma carteira diversificada com retorno real de 5% a 7% ao ano. O prazo depende muito mais da taxa de poupança do que da escolha de ativos.",
  },
  {
    q: "Devo focar em dividendos ou em crescimento?",
    a: "Na acumulação, o total return (valorização + proventos reinvestidos) é o que importa. Perto da fase de usufruto, aumenta-se gradualmente o peso de ativos pagadores de renda para tornar o fluxo de caixa previsível.",
  },
];

function GuiaPage() {
  return (
    <div className="min-h-screen bg-background">
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
              <Link to="/dashboard">
                Entrar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <article>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Guia completo</p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold">
            Liberdade financeira: o guia passo a passo da alocação à renda passiva
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Independência financeira não é sorte nem um ativo mágico: é a combinação de taxa de
            poupança, alocação de ativos coerente e reinvestimento disciplinado de proventos ao longo
            de anos. Abaixo está o caminho completo, na ordem em que ele deve ser executado.
          </p>

          <section className="mt-10 space-y-8">
            {steps.map((s) => (
              <div key={s.title}>
                <h2 className="text-xl font-semibold">{s.title}</h2>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">
              Da alocação de ativos à renda passiva: por que os dois andam juntos
            </h2>
            <p className="mt-2 text-muted-foreground">
              A alocação define o risco que você aceita correr; a renda passiva define quando você
              pode parar. Uma carteira concentrada em poucos ativos pode entregar dividendos altos
              hoje e cortar tudo no ciclo seguinte. Uma carteira alocada por classes — renda fixa,
              ações, FIIs e exterior — produz um fluxo de proventos mais estável, e é justamente essa
              estabilidade que permite calcular com confiança o ano em que a renda dos investimentos
              cobre o seu custo de vida.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
            <div className="mt-4 space-y-6">
              {faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="font-medium">{f.q}</h3>
                  <p className="mt-1 text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Calcule o seu ano da liberdade financeira</h2>
            <p className="mt-2 text-muted-foreground">
              O planejador da plataforma projeta patrimônio, renda passiva e o ano da independência
              financeira a partir dos seus aportes e da sua alocação real.
            </p>
            <Button asChild className="mt-4">
              <Link to="/planejador">
                Abrir o planejador <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
