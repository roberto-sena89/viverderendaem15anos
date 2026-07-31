import { BookOpen } from "lucide-react";

const TOPICOS: { titulo: string; texto: string }[] = [
  {
    titulo: "O que é um ETF?",
    texto:
      "ETF (Exchange Traded Fund) é um fundo de índice negociado em bolsa como se fosse uma ação. Ao comprar uma cota você compra, de uma só vez, uma cesta de ativos que replica um índice — por exemplo o Ibovespa, o S&P 500 ou uma carteira de títulos públicos.",
  },
  {
    titulo: "Patrimônio e liquidez",
    texto:
      "O patrimônio mostra o tamanho do fundo e o volume mostra quanto foi negociado no pregão. Fundos maiores e mais negociados costumam ter spread menor entre compra e venda, o que reduz o custo de entrar e sair da posição.",
  },
  {
    titulo: "Dividend yield em ETFs",
    texto:
      "Nem todo ETF distribui proventos. Os fundos de acumulação reinvestem automaticamente os dividendos recebidos e aparecem aqui sem dividend yield — a remuneração se reflete na valorização da cota, não em pagamentos periódicos.",
  },
  {
    titulo: "Rentabilidade passada não é garantia",
    texto:
      "As variações de 30 dias, 12, 24 e 60 meses ajudam a entender o comportamento histórico do índice replicado, mas não projetam retorno futuro. Considere também a taxa de administração e a aderência do fundo ao índice.",
  },
];

/** Rodapé educativo da grade de ETFs. */
export function RodapeEducativoEtfs() {
  return (
    <section className="panel p-4" aria-labelledby="glossario-etfs">
      <h2 id="glossario-etfs" className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="size-4 text-primary" aria-hidden />
        Como interpretar esta grade
      </h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        {TOPICOS.map((t) => (
          <div key={t.titulo}>
            <dt className="text-sm font-medium">{t.titulo}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.texto}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Dados de preço em tempo quase real durante o pregão; indicadores fundamentais atualizados
        diariamente. Conteúdo informativo, sem recomendação de compra ou venda.
      </p>
    </section>
  );
}
