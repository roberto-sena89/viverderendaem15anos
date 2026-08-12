import { createFileRoute, Link } from "@tanstack/react-router";
import { brl } from "@/lib/portfolio";
import { urlAbsoluta } from "@/lib/seo";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, ShieldCheck, Wallet, PieChart } from "lucide-react";
import { RodapePublico } from "@/components/rodape-publico";

const TITLE = "Quanto Rende 1 Milhão por Mês? Comparativo Poupança vs FIIs vs Ações";
const DESCRIPTION = "Descubra quanto rende 1 milhão de reais por mês nos principais investimentos: Poupança, CDB, Fundos Imobiliários e Ações. Veja o comparativo real e planeje sua independência.";
const URL = urlAbsoluta("/comparativo-investimentos");

export const Route = createFileRoute("/comparativo-investimentos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": TITLE,
          "description": DESCRIPTION,
          "author": {
            "@type": "Organization",
            "name": "Viver de Renda em 15 Anos"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Viver de Renda em 15 Anos"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": URL
          }
        })
      }
    ]
  }),
  component: ComparativoPage,
});

const DADOS_COMPARATIVOS = [
  {
    investimento: "Poupança (Taxa Referencial + 0,5%)",
    rendimentoMensal: 0.5,
    rendaMensal: 5000,
    perfil: "Conservador",
    risco: "Baixo",
    liquidez: "Imediata"
  },
  {
    investimento: "CDB 100% CDI (Selic a 10.75%)",
    rendimentoMensal: 0.85,
    rendaMensal: 8500,
    perfil: "Conservador",
    risco: "Baixo",
    liquidez: "Diária/Vencimento"
  },
  {
    investimento: "Tesouro IPCA+ (Rendimento Real)",
    rendimentoMensal: 0.55,
    rendaMensal: 5500,
    perfil: "Moderado",
    risco: "Médio",
    liquidez: "D+1"
  },
  {
    investimento: "Fundos Imobiliários (FIIs - Média)",
    rendimentoMensal: 0.9,
    rendaMensal: 9000,
    perfil: "Moderado",
    risco: "Médio",
    liquidez: "D+2 (Venda em Bolsa)"
  },
  {
    investimento: "Ações (Dividend Yield Médio)",
    rendimentoMensal: 0.6,
    rendaMensal: 6000,
    perfil: "Arrojado",
    risco: "Alto",
    liquidez: "D+2"
  }
];

function ComparativoPage() {
  const montante = 1000000;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-brand font-bold text-lg text-primary tracking-tight">Viver de Renda</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Acessar Plataforma</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-hero text-4xl sm:text-6xl font-bold tracking-tight text-balance">
              Quanto rende <span className="text-primary">1 milhão de reais</span> por mês?
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty">
              Ter um patrimônio de sete dígitos é o sonho de muitos investidores. Mas na prática, quanto esse valor pode gerar de renda passiva mensal para você viver de renda?
            </p>
          </div>
        </section>

        <section className="py-12 px-4 max-w-6xl mx-auto">
          <div className="grid gap-8">
            <div className="panel p-6 sm:p-8 overflow-x-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <PieChart className="size-6 text-primary" />
                Comparativo de Rendimento Mensal (Investimento de {brl(montante, 0)})
              </h2>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/60">
                    <TableHead className="font-bold text-foreground">Investimento</TableHead>
                    <TableHead className="font-bold text-foreground text-center">Rentabilidade Mensal</TableHead>
                    <TableHead className="font-bold text-foreground text-right">Renda Estimada</TableHead>
                    <TableHead className="font-bold text-foreground hidden sm:table-cell text-center">Risco</TableHead>
                    <TableHead className="font-bold text-foreground hidden md:table-cell">Liquidez</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DADOS_COMPARATIVOS.map((d) => (
                    <TableRow key={d.investimento} className="border-border/40 hover:bg-white/[0.02]">
                      <TableCell className="font-medium">{d.investimento}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">{d.rendimentoMensal}%</TableCell>
                      <TableCell className="text-right font-bold text-lg tabular-nums">{brl(d.rendaMensal, 2)}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.risco === "Baixo" ? "bg-emerald-500/10 text-emerald-500" :
                          d.risco === "Médio" ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {d.risco}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell text-xs">{d.liquidez}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-4 text-xs text-muted-foreground italic text-right">
                * Valores brutos baseados em taxas médias de mercado (agosto/2024). Podem variar conforme tributação e oscilações econômicas.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="panel p-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="size-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Proteção do Poder de Compra</h3>
                <p className="text-sm text-muted-foreground">
                  Investir apenas focando em renda pode ser perigoso se você não considerar a inflação. O ideal é reinvestir parte do lucro para manter seu patrimônio valorizado.
                </p>
              </div>
              <div className="panel p-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="size-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Diversificação é a Chave</h3>
                <p className="text-sm text-muted-foreground">
                  Não coloque todos os ovos na mesma cesta. Uma carteira equilibrada com FIIs, Ações e Renda Fixa reduz riscos e otimiza sua renda mensal.
                </p>
              </div>
              <div className="panel p-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="size-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Juros Compostos</h3>
                <p className="text-sm text-muted-foreground">
                  Se você ainda não tem 1 milhão, o foco deve ser a acumulação. Aportes constantes somados aos dividendos aceleram sua jornada rumo à liberdade.
                </p>
              </div>
            </div>

            <div className="bg-card border border-primary/20 rounded-2xl p-8 sm:p-12 text-center overflow-hidden relative isolate">
              <div className="absolute inset-0 -z-10 bg-primary/5 blur-3xl" />
              <h2 className="text-2xl sm:text-4xl font-bold mb-4">Quer atingir seu primeiro milhão em 15 anos?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Utilize nossa plataforma premium para controlar sua carteira, acompanhar dividendos e simular seu rebalanceamento ideal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="rounded-xl px-10 font-bold">
                  <Link to="/auth">
                    Criar Conta Gratuita <ArrowRight className="ml-2 size-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-xl px-10 font-bold">
                  <Link to="/">Voltar para Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto prose dark:prose-invert">
            <h2 className="text-3xl font-bold mb-6">Análise Detalhada dos Investimentos</h2>
            <p className="mb-4">
              Ao planejar viver de renda com 1 milhão de reais, é fundamental entender a diferença entre renda nominal e renda real. A <strong>Poupança</strong>, embora seja o porto seguro mais conhecido, raramente oferece um ganho real significativo acima da inflação.
            </p>
            <h3 className="text-xl font-bold mt-8 mb-4 underline decoration-primary underline-offset-4">Fundos Imobiliários (FIIs)</h3>
            <p className="mb-4">
              Os FIIs são, atualmente, um dos veículos preferidos para renda mensal. A isenção de Imposto de Renda para pessoas físicas nos dividendos torna a taxa de ~0,9% ao mês muito atrativa quando comparada ao CDB, que sofre tributação regressiva.
            </p>
            <h3 className="text-xl font-bold mt-8 mb-4 underline decoration-primary underline-offset-4">O Risco das Ações</h3>
            <p className="mb-4">
              Ações de empresas sólidas (Blue Chips) focadas em dividendos podem render muito, mas o investidor deve estar preparado para a volatilidade do patrimônio. O milhão investido hoje pode virar 900 mil amanhã, embora os dividendos continuem caindo na conta.
            </p>
          </div>
        </section>
      </main>

      <RodapePublico />
    </div>
  );
}
