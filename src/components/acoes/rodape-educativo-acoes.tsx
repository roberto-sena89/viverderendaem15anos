import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Panel } from "@/components/panel";

const TOPICOS = [
  {
    titulo: "O que são ações",
    texto:
      "Uma ação é a menor fração do capital de uma empresa de capital aberto. Ao comprar uma ação na B3 você se torna sócio do negócio e passa a ter direito a uma parte dos resultados, distribuídos como dividendos e juros sobre capital próprio, além de acompanhar a valorização (ou desvalorização) do preço do papel no mercado.",
  },
  {
    titulo: "Como funcionam as ações",
    texto:
      "Os papéis são negociados em pregão eletrônico entre 10h e 17h55, com preços definidos pelo encontro entre ofertas de compra e venda. Empresas listadas divulgam balanços trimestrais e anuais, e é a partir desses números que se calculam os indicadores fundamentalistas desta página — por isso eles mudam apenas quando há novo balanço, enquanto o preço muda a cada negócio fechado.",
  },
  {
    titulo: "Mini-glossário dos indicadores",
    texto:
      "P/L: preço dividido pelo lucro por ação — quantos anos de lucro atual pagam o preço. P/VP: preço sobre o valor patrimonial por ação; abaixo de 1 o mercado paga menos que o patrimônio contábil. DY: proventos dos últimos 12 meses sobre o preço. ROE: lucro sobre o patrimônio dos acionistas. EV/EBIT: valor da firma sobre o resultado operacional. Margem líquida: quanto de cada real faturado vira lucro.",
  },
  {
    titulo: "Preço-teto de Bazin e preço justo de Graham",
    texto:
      "O método Bazin define um preço máximo de compra a partir do dividendo anual e de um yield mínimo exigido (usamos 6% ao ano). O método Graham estima um preço justo pela raiz de 22,5 × lucro por ação × valor patrimonial por ação. Ambos são atalhos simplificados: servem como filtro inicial, nunca como decisão isolada.",
  },
  {
    titulo: "Riscos que você deve considerar",
    texto:
      "Resultados passados não garantem retorno futuro. Empresas cíclicas, alavancadas ou dependentes de poucos clientes oscilam mais; papéis com baixa liquidez podem exigir descontos na venda; e mudanças regulatórias, tributárias ou de juros afetam setores inteiros de uma só vez.",
  },
];

/** Conteúdo educativo do rodapé da grade de ações. */
export function RodapeEducativoAcoes() {
  return (
    <Panel title="Entenda as ações" hint="Conteúdo educacional — não é recomendação de investimento.">
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
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Os dados desta página vêm de fontes públicas de mercado e podem sofrer atraso ou divergência. Indicadores
        fundamentalistas são sincronizados diariamente, a partir dos balanços das companhias; preços e variações
        acompanham o pregão da B3. Nada aqui constitui recomendação de compra ou venda.
      </p>
    </Panel>
  );
}
