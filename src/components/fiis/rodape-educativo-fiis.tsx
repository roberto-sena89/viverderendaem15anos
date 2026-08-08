import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Panel } from "@/components/panel";

const TOPICOS = [
  {
    titulo: "O que é um fundo imobiliário (FII)?",
    texto:
      "É um condomínio de investidores que reúne recursos para aplicar em imóveis físicos ou em títulos ligados ao setor imobiliário. Cada investidor compra cotas negociadas na B3 e recebe, em geral mensalmente, a parcela dos rendimentos gerados por aluguéis ou juros.",
  },
  {
    titulo: "Como interpretar o dividend yield",
    texto:
      "O dividend yield mostra quanto o fundo distribuiu nos últimos 12 meses em relação ao preço atual da cota. Um yield muito acima da média do mercado pode indicar rendimentos não recorrentes, risco de crédito nos ativos ou queda recente do preço — sempre compare com o histórico de cinco anos.",
  },
  {
    titulo: "P/VP: cota cara ou barata?",
    texto:
      "O P/VP compara o preço da cota com o valor patrimonial por cota. Abaixo de 1,00 significa que o mercado paga menos do que o patrimônio contábil; acima de 1,00, há um prêmio. O indicador só faz sentido junto com a qualidade dos imóveis, a vacância e a consistência das distribuições.",
  },
  {
    titulo: "Tijolo, papel, híbrido, FOF e Fiagro",
    texto:
      "Fundos de tijolo possuem imóveis físicos (galpões, shoppings, lajes). Fundos de papel investem em CRIs e títulos indexados ao IPCA ou ao CDI. Híbridos combinam as duas estratégias, FOFs compram cotas de outros fundos e Fiagros aplicam no agronegócio. Cada classe reage de forma diferente a juros e inflação.",
  },
  {
    titulo: "Riscos que você deve considerar",
    texto:
      "Vacância e inadimplência dos inquilinos, alta de juros (que pressiona o preço das cotas), concentração em poucos imóveis ou devedores, baixa liquidez para vender as cotas e a possibilidade de mudanças na tributação dos rendimentos.",
  },
  {
    titulo: "Liquidez importa mais do que parece",
    texto:
      "A liquidez diária indica quanto dinheiro é negociado por dia naquele fundo. Fundos com baixa liquidez podem exigir descontos relevantes na hora da venda e apresentam maior oscilação de preço com poucos negócios.",
  },
];

/** Conteúdo educativo do rodapé da grade de FIIs. */
export function RodapeEducativoFiis() {
  return (
    <Panel
      title="Entenda os fundos imobiliários"
      hint="Conteúdo educacional — não é recomendação de investimento."
    >
      <Accordion type="single" collapsible className="w-full">
        {TOPICOS.map((t) => (
          <AccordionItem key={t.titulo} value={t.titulo}>
            <AccordionTrigger className="text-left text-sm">{t.titulo}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {t.texto}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="t-caption mt-secao leading-relaxed">
        Os dados desta página são coletados de fontes públicas de mercado e podem sofrer atraso ou
        divergência. Indicadores fundamentalistas são atualizados diariamente; preços e variações
        acompanham o pregão da B3. Nada aqui constitui recomendação de compra ou venda — avalie os
        relatórios gerenciais de cada fundo antes de investir.
      </p>
    </Panel>
  );
}
