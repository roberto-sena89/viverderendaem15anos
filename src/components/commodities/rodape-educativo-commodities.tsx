/** Bloco educativo curto ao pé da grade, em texto próprio. */
export function RodapeEducativoCommodities() {
  return (
    <div className="grid gap-secao lg:grid-cols-2">
      <div className="panel p-cartao">
        <p className="panel-title mb-2">O que são commodities</p>
        <p className="t-body-sm leading-relaxed text-muted-foreground">
          São matérias-primas padronizadas — petróleo, ouro, minério de ferro, soja, café, boi —
          negociadas em bolsas internacionais por contratos futuros. Como o produto é padronizado, o
          que muda é apenas o preço, formado globalmente em dólar e por unidade de medida própria:
          barril, onça troy, tonelada, saca de 60 kg, libra-peso ou arroba. Por isso a mesma
          commodity vale o mesmo em qualquer país, descontados frete, impostos e câmbio.
        </p>
      </div>
      <div className="panel p-cartao">
        <p className="panel-title mb-2">Como investir em commodities</p>
        <ul className="t-body-sm space-y-1.5 leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Ações correlatas:</strong> exposição indireta via
            empresas do setor (petroleiras, mineradoras, frigoríficos, sucroenergéticas).
          </li>
          <li>
            <strong className="text-foreground">ETFs:</strong> fundos listados na B3 ou no exterior
            que replicam cestas de commodities ou o ouro, sem precisar operar futuros.
          </li>
          <li>
            <strong className="text-foreground">Contratos futuros:</strong> acesso direto ao preço,
            com alavancagem, ajuste diário e risco elevado — adequado a quem já domina o mercado.
          </li>
        </ul>
        <p className="t-caption mt-bloco">
          Conteúdo educativo, não é recomendação de investimento.
        </p>
      </div>
    </div>
  );
}
