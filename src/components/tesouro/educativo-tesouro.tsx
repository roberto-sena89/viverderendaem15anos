import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TIPOS_TITULO } from "@/lib/tesouro-base";

const PERGUNTAS = [
  {
    q: "Como funciona a tributação?",
    a: "O Imposto de Renda segue a tabela regressiva e incide apenas sobre o rendimento: 22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% acima disso. Ele é recolhido na fonte no resgate, no vencimento ou no pagamento de cupom.",
  },
  {
    q: "Quais são as taxas cobradas?",
    a: "A B3 cobra 0,20% ao ano de custódia sobre o valor investido, cobrada semestralmente. O Tesouro Selic é isento dessa taxa até R$ 10 mil. A maioria das corretoras não cobra taxa de administração.",
  },
  {
    q: "O que é marcação a mercado?",
    a: "O preço dos títulos oscila diariamente conforme as expectativas de juros. Se você levar até o vencimento, recebe exatamente a taxa contratada. Se vender antes, recebe o preço do dia — que pode ser maior ou menor.",
  },
  {
    q: "Posso resgatar antes do vencimento?",
    a: "Sim. O Tesouro Nacional garante a recompra diária, com liquidação em um dia útil. O valor recebido, porém, é o preço de mercado do dia, sujeito à marcação a mercado.",
  },
  {
    q: "Qual é o risco?",
    a: "Títulos públicos são considerados os investimentos de menor risco de crédito do país, pois quem paga é o Tesouro Nacional. O risco relevante é o de preço em resgates antecipados.",
  },
  {
    q: "Qual o valor mínimo para investir?",
    a: "É possível comprar frações a partir de 1% do título, respeitando o piso de R$ 30 por operação.",
  },
];

/** Rodapé educativo: glossário dos títulos e dúvidas frequentes. */
export function EducativoTesouro() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Tipos de título</h3>
        <dl className="mt-3 space-y-3">
          {TIPOS_TITULO.map((t) => (
            <div key={t.id}>
              <dt className="text-sm font-medium">
                {t.rotulo}{" "}
                <span className="text-xs font-normal text-muted-foreground">({t.sigla})</span>
              </dt>
              <dd className="text-xs text-muted-foreground">{t.explicacao}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Perguntas frequentes</h3>
        <Accordion type="single" collapsible className="mt-1">
          {PERGUNTAS.map((p) => (
            <AccordionItem key={p.q} value={p.q}>
              <AccordionTrigger className="text-left text-sm">{p.q}</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">{p.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Preços e taxas oficiais do Tesouro Nacional, divulgados uma vez por dia útil. Conteúdo
          informativo, sem recomendação de investimento.
        </p>
      </div>
    </div>
  );
}
