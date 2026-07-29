import { Panel } from "@/components/panel";

type Linha = { indexador: string; prazo: string; alvo: number };
type Bloco = { grupo: string; risco: string; linhas: Linha[] };

/** Carteira recomendada (perfil agressivo) — referência de alocação por classe. */
const BLOCOS: Bloco[] = [
  {
    grupo: "Renda Fixa",
    risco: "Baixo",
    linhas: [
      { indexador: "Pós-fixado (CDI ou Selic)", prazo: "Liquidez imediata", alvo: 30 },
      { indexador: "IPCA+", prazo: "Prazo maior que 5 anos", alvo: 15 },
      { indexador: "Pré-fixado", prazo: "Prazo maior que 5 anos", alvo: 5 },
    ],
  },
  {
    grupo: "Renda Variável",
    risco: "Alto",
    linhas: [
      { indexador: "Bolsa Brasileira", prazo: "BOVA11 ou Trend Bolsa Brasileira", alvo: 20 },
      { indexador: "Bolsa Americana", prazo: "IVVB11 ou Trend Bolsa Americana (sem o dólar)", alvo: 20 },
      { indexador: "Fundos Imobiliários", prazo: "MCRE11 (Mauá Capital Real Estate)", alvo: 2 },
      { indexador: "Fundos Imobiliários", prazo: "TRXF11 (TRX Real Estate)", alvo: 2 },
      { indexador: "Fundos Imobiliários", prazo: "MXRF11 (Maxi Renda)", alvo: 2 },
      { indexador: "Fundos Imobiliários", prazo: "XPML11 (BTG Pactual Shoppings)", alvo: 2 },
      { indexador: "Fundos Imobiliários", prazo: "BTLG11 (Kinea Renda Imobiliária)", alvo: 2 },
    ],
  },
];

export function CarteiraRecomendada() {
  const total = BLOCOS.reduce((s, b) => s + b.linhas.reduce((x, l) => x + l.alvo, 0), 0);

  return (
    <Panel
      title="Carteira recomendada"
      hint="Perfil agressivo · referência de alocação-alvo por classe de ativo"
      action={
        <span className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-display text-xs font-bold tracking-wide text-accent-foreground uppercase">
          Total {total}%
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-[0.68rem] tracking-wider text-muted-foreground uppercase">
              <th className="w-40 px-4 py-3 text-left font-semibold">Classe</th>
              <th className="px-4 py-3 text-left font-semibold">Indexador</th>
              <th className="px-4 py-3 text-left font-semibold">Prazo / veículo</th>
              <th className="w-28 px-4 py-3 text-right font-semibold">Agressivo</th>
            </tr>
          </thead>
          <tbody>
            {BLOCOS.map((bloco) =>
              bloco.linhas.map((linha, i) => (
                <tr
                  key={`${bloco.grupo}-${linha.prazo}`}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  {i === 0 ? (
                    <th
                      scope="rowgroup"
                      rowSpan={bloco.linhas.length}
                      className="border-r border-border bg-primary-soft/60 px-4 py-3 text-left align-middle"
                    >
                      <span className="block font-display text-sm font-bold text-accent-foreground">
                        {bloco.grupo}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-muted-foreground">
                        Risco {bloco.risco}
                      </span>
                    </th>
                  ) : null}
                  <td className="px-4 py-3 font-medium">{linha.indexador}</td>
                  <td className="px-4 py-3 text-muted-foreground">{linha.prazo}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
                        <span
                          className="block h-full rounded-full bg-gradient-brand"
                          style={{ width: `${Math.min(100, (linha.alvo / 30) * 100)}%` }}
                        />
                      </span>
                      <span className="font-display font-bold tabular-nums">
                        {linha.alvo.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
