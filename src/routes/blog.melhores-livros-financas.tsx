import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TITLE = "Os Melhores Livros de Finanças e Investimentos para 2026";
const DESCRIPTION =
  "Comparativo dos melhores livros de finanças e investimentos: comportamento, renda passiva, análise fundamentalista e técnica, para todos os níveis.";
const URL = "https://viverderendaem15anos.lovable.app/blog/melhores-livros-financas";

interface Livro {
  titulo: string;
  autor: string;
  foco: string;
  nivel: "Iniciante" | "Intermediário" | "Avançado";
  paraQuem: string;
  resumo: string;
}

const livros: Livro[] = [
  {
    titulo: "A Psicologia Financeira",
    autor: "Morgan Housel",
    foco: "Comportamento",
    nivel: "Iniciante",
    paraQuem: "Quem erra por impulso, vende no pânico ou compra na euforia",
    resumo:
      "Mostra que resultado de longo prazo depende mais de comportamento do que de planilha. É o contraponto direto aos livros técnicos: em vez de ensinar a escolher ativos, ensina a não sabotar a própria carteira. Melhor primeiro livro para quem está começando.",
  },
  {
    titulo: "Pai Rico, Pai Pobre",
    autor: "Robert Kiyosaki",
    foco: "Educação financeira",
    nivel: "Iniciante",
    paraQuem: "Quem ainda não separa ativo de passivo no orçamento",
    resumo:
      "Popularizou a ideia de construir renda a partir de ativos em vez de salário. Vale pela mudança de mentalidade, não pelas recomendações práticas — trate os conselhos operacionais com ceticismo e combine com um livro técnico.",
  },
  {
    titulo: "Os Segredos da Mente Milionária",
    autor: "T. Harv Eker",
    foco: "Comportamento",
    nivel: "Iniciante",
    paraQuem: "Quem tem renda boa e nunca sobra dinheiro no fim do mês",
    resumo:
      "Trabalha crenças e hábitos de consumo. Serve como apoio na fase de aumentar a taxa de poupança, que é a variável que mais encurta o prazo até a independência financeira.",
  },
  {
    titulo: "O Investidor Inteligente",
    autor: "Benjamin Graham",
    foco: "Análise fundamentalista",
    nivel: "Avançado",
    paraQuem: "Quem quer avaliar empresas e comprar com margem de segurança",
    resumo:
      "A base do value investing: margem de segurança, diferença entre investir e especular e o conceito de Mr. Market. Denso e datado em alguns exemplos, mas continua sendo a referência técnica mais citada do mercado.",
  },
  {
    titulo: "Investindo em Ações no Longo Prazo",
    autor: "Jeremy Siegel",
    foco: "Dados históricos",
    nivel: "Avançado",
    paraQuem: "Quem quer entender retorno real de ações versus renda fixa",
    resumo:
      "Reúne mais de um século de dados comparando ações, títulos e inflação. Útil para definir expectativa realista de rentabilidade anual ao montar uma projeção de patrimônio.",
  },
  {
    titulo: "O Jeito Warren Buffett de Investir",
    autor: "Robert Hagstrom",
    foco: "Análise fundamentalista",
    nivel: "Intermediário",
    paraQuem: "Quem quer critérios objetivos para escolher boas empresas",
    resumo:
      "Traduz os princípios de Buffett em filtros aplicáveis: negócios simples, vantagem competitiva durável, gestão honesta e preço com desconto. Ponte entre Graham e a prática do dia a dia.",
  },
  {
    titulo: "Análise Técnica dos Mercados Financeiros",
    autor: "John Murphy",
    foco: "Análise técnica",
    nivel: "Avançado",
    paraQuem: "Quem opera prazos curtos ou quer refinar pontos de entrada",
    resumo:
      "Manual clássico de gráficos, tendências, suportes e indicadores. É a escola oposta à fundamentalista: foca em preço e volume, não no valor da empresa. Para o investidor de longo prazo, serve no máximo como apoio ao timing de aporte.",
  },
  {
    titulo: "Do Mil ao Milhão",
    autor: "Thiago Nigro",
    foco: "Renda passiva",
    nivel: "Iniciante",
    paraQuem: "Quem quer um plano prático em português para começar já",
    resumo:
      "Organiza o caminho em gastar bem, investir melhor e ganhar mais, com exemplos do mercado brasileiro (Tesouro Direto, ações, FIIs). Linguagem acessível e aplicável ao contexto de tributação e produtos do Brasil.",
  },
  {
    titulo: "Guia Suno Fundos Imobiliários",
    autor: "Marcos Baroni e Danilo Bastos",
    foco: "Renda passiva / FIIs",
    nivel: "Intermediário",
    paraQuem: "Quem quer construir renda mensal com fundos imobiliários",
    resumo:
      "Detalha tipos de FII (tijolo, papel, fundo de fundos), indicadores como P/VP e dividend yield e critérios de seleção. Leitura direta para quem monta a parcela de renda da carteira.",
  },
  {
    titulo: "Um Passeio Aleatório por Wall Street",
    autor: "Burton Malkiel",
    foco: "Alocação e índices",
    nivel: "Intermediário",
    paraQuem: "Quem quer decidir entre carteira ativa e ETFs",
    resumo:
      "Defende a eficiência de mercado e o uso de índices de baixo custo. É o melhor contraponto aos livros de stock picking e ajuda a definir quanto da carteira faz sentido manter em ETFs.",
  },
];

const comparacoes = [
  {
    titulo: "Psicologia financeira x análise técnica",
    texto:
      "São respostas para perguntas diferentes. Housel explica por que o investidor perde dinheiro mesmo com boas escolhas — o erro está na reação emocional. Murphy explica como ler preço e volume para decidir quando comprar. Para quem investe com horizonte de 10 a 15 anos, o ganho de dominar comportamento é muito maior do que o de acertar o ponto exato de entrada.",
  },
  {
    titulo: "Fundamentalista x indexado",
    texto:
      "Graham e Hagstrom partem do princípio de que é possível encontrar empresas negociadas abaixo do valor justo. Malkiel argumenta que, descontados custos e erros, a maioria não supera o índice. Na prática, muita gente combina: um núcleo em ETFs e uma parcela menor em escolhas próprias.",
  },
  {
    titulo: "Renda passiva x acumulação total",
    texto:
      "Livros de FIIs e dividendos otimizam fluxo de caixa mensal; Siegel e Malkiel otimizam retorno total. Na fase de acumulação, reinvestir proventos costuma render mais; perto do usufruto, previsibilidade de renda passa a valer mais que retorno máximo.",
  },
];

const trilha = [
  {
    etapa: "1. Organizar o orçamento",
    livros: "A Psicologia Financeira · Os Segredos da Mente Milionária",
    objetivo: "Elevar a taxa de poupança e criar consistência de aportes.",
  },
  {
    etapa: "2. Entender os produtos",
    livros: "Do Mil ao Milhão · Um Passeio Aleatório por Wall Street",
    objetivo: "Escolher entre renda fixa, ETFs, ações e FIIs com critério.",
  },
  {
    etapa: "3. Avaliar ativos",
    livros: "O Investidor Inteligente · O Jeito Warren Buffett de Investir",
    objetivo: "Analisar empresas e comprar com margem de segurança.",
  },
  {
    etapa: "4. Construir renda",
    livros: "Guia Suno Fundos Imobiliários · Investindo em Ações no Longo Prazo",
    objetivo: "Transformar patrimônio em renda passiva previsível.",
  },
];

const faqs = [
  {
    q: "Qual o melhor livro de finanças para quem está começando?",
    a: "A Psicologia Financeira, de Morgan Housel. Ele não exige conhecimento prévio, resolve a maior causa de prejuízo do iniciante (decisões emocionais) e prepara o terreno para os livros técnicos que vêm depois.",
  },
  {
    q: "Qual a ordem ideal de leitura dos livros sobre investimentos?",
    a: "Comece por comportamento e orçamento, avance para produtos e alocação, depois para análise de empresas e, por fim, para construção de renda passiva. A trilha em quatro etapas acima segue exatamente essa sequência.",
  },
  {
    q: "Vale a pena ler livros de análise técnica se invisto no longo prazo?",
    a: "Só como complemento. Análise técnica ajuda a escolher o momento do aporte, mas não define quais ativos manter por 10 ou 15 anos. Priorize fundamentos, alocação e comportamento.",
  },
  {
    q: "Livros de finanças pessoais substituem um planejamento próprio?",
    a: "Não. Os livros dão o método; o resultado vem de aplicar aportes, alocação-alvo e rebalanceamento na sua realidade. Use o planejador da plataforma para transformar a leitura em metas com prazo e valor.",
  },
];

export const Route = createFileRoute("/blog/melhores-livros-financas")({
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
          publisher: { "@type": "Organization", name: "Investidor em 15 Anos" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: TITLE,
          itemListElement: livros.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Book",
              name: l.titulo,
              author: { "@type": "Person", name: l.autor },
              description: l.resumo,
            },
          })),
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
            { "@type": "ListItem", position: 1, name: "Início", item: "https://viverderendaem15anos.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Melhores livros de finanças", item: URL },
          ],
        }),
      },
    ],
  }),
  component: LivrosPage,
});

function LivrosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
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

      <main className="mx-auto max-w-4xl px-5 py-12">
        <article>
          <nav aria-label="Trilha de navegação" className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Início
            </Link>{" "}
            / <span>Melhores livros de finanças</span>
          </nav>

          <p className="mt-4 inline-flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
            <BookOpen className="size-4" /> Guia de leitura
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold">{TITLE}</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Escolher entre os melhores livros de finanças fica mais fácil quando você sabe qual
            problema cada um resolve. Abaixo estão dez livros sobre investimentos organizados por
            foco — comportamento, análise fundamentalista, análise técnica e renda passiva — com
            comparação direta entre as escolas e uma trilha de leitura em quatro etapas.
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Comparativo rápido</h2>
            <div className="mt-4 overflow-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="uppercase">Livro</TableHead>
                    <TableHead className="uppercase">Foco</TableHead>
                    <TableHead className="uppercase">Nível</TableHead>
                    <TableHead className="uppercase">Indicado para</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {livros.map((l) => (
                    <TableRow key={l.titulo}>
                      <TableCell className="font-medium">
                        {l.titulo}
                        <span className="block text-xs text-muted-foreground">{l.autor}</span>
                      </TableCell>
                      <TableCell className="text-sm">{l.foco}</TableCell>
                      <TableCell className="text-sm">{l.nivel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.paraQuem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="mt-12 space-y-8">
            <h2 className="text-2xl font-semibold">Os 10 melhores livros de finanças e investimentos</h2>
            {livros.map((l, i) => (
              <div key={l.titulo} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-semibold">
                  {i + 1}. {l.titulo}
                </h3>
                <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
                  {l.autor} · {l.foco} · {l.nivel}
                </p>
                <p className="mt-3 text-muted-foreground">{l.resumo}</p>
              </div>
            ))}
          </section>

          <section className="mt-12 space-y-6">
            <h2 className="text-2xl font-semibold">Qual escola escolher: comparação por intenção</h2>
            {comparacoes.map((c) => (
              <div key={c.titulo}>
                <h3 className="font-medium">{c.titulo}</h3>
                <p className="mt-1 text-muted-foreground">{c.texto}</p>
              </div>
            ))}
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Trilha de leitura em 4 etapas</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {trilha.map((t) => (
                <div key={t.etapa} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold">{t.etapa}</h3>
                  <p className="mt-2 text-sm">{t.livros}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t.objetivo}</p>
                </div>
              ))}
            </div>
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
            <h2 className="text-xl font-semibold">Da leitura para a prática</h2>
            <p className="mt-2 text-muted-foreground">
              Depois de escolher a estratégia, simule quanto tempo falta para viver de renda com os
              seus aportes reais — ou continue no guia completo de liberdade financeira.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/calculadora-juros-compostos">
                  Calculadora de juros compostos <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/guia-liberdade-financeira">Guia de liberdade financeira</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
