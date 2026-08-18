import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtBRL, fmtNum, fmtPct } from "@/components/tesouro/resumo-tesouro";
import { aliquotaIr, simular, type LinhaTesouro } from "@/lib/tesouro-base";
import { TextoTruncado } from "@/components/texto-truncado";

const diasAte = (iso: string) =>
  Math.max(1, Math.round((new Date(`${iso}T12:00:00`).getTime() - Date.now()) / 86_400_000));

/**
 * Simulador do título: aplica juro composto sobre a rentabilidade estimada e
 * desconta taxa de custódia da B3, IR regressivo e IOF (resgates < 30 dias).
 */
export function SimuladorTesouro({ linha, cdi }: { linha: LinhaTesouro; cdi: number | null }) {
  const diasVencimento = diasAte(linha.vencimento);
  const [valor, setValor] = useState(() =>
    Math.max(100, Math.round(linha.investimentoMinimo ?? 100)),
  );
  const [dias, setDias] = useState(diasVencimento);

  const taxa = linha.rentabilidadeEstimada ?? linha.taxaCompra ?? 0;
  const resultado = useMemo(
    () =>
      simular({
        valorInvestido: valor,
        taxaAnual: taxa,
        dias,
        isentoCustodia: linha.tipo === "SELIC",
        cdi,
      }),
    [valor, taxa, dias, linha.tipo, cdi],
  );

  const antecipado = dias < diasVencimento;

  return (
    <div className="pilha-secao">
      <div className="grid gap-secao sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="valor-simulacao">Valor investido</Label>
          <Input
            id="valor-simulacao"
            type="number"
            min={30}
            step={50}
            value={valor}
            onChange={(e) => setValor(Math.max(0, Number(e.target.value)))}
            className="tabular-nums"
          />
          <div className="flex flex-wrap gap-1.5">
            {[100, 500, 1000, 5000, 10000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValor(v)}
                className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
              >
                {fmtBRL(v, 0)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prazo-simulacao">
            Prazo · {fmtNum(dias / 365, 1)} anos{" "}
            {antecipado ? "(resgate antecipado)" : "(até o vencimento)"}
          </Label>
          <Slider
            id="prazo-simulacao"
            min={30}
            max={diasVencimento}
            step={30}
            value={[Math.min(dias, diasVencimento)]}
            onValueChange={([d]) => setDias(d)}
            className="py-3"
          />
          <p className="text-[11px] text-muted-foreground">
            {antecipado
              ? "No resgate antecipado o preço segue a marcação a mercado — o retorno pode variar."
              : "Levando até o vencimento você recebe exatamente a taxa contratada."}
          </p>
        </div>
      </div>

      <div className="grid gap-bloco sm:grid-cols-3">
        <Metrica rotulo="Valor bruto" valor={fmtBRL(resultado.valorBruto)} />
        <Metrica rotulo="Valor líquido" valor={fmtBRL(resultado.valorLiquido)} destaque />
        <Metrica
          rotulo="Rendimento líquido"
          valor={fmtBRL(resultado.rendimentoLiquido)}
          detalhe={`${fmtPct(resultado.rentabilidadeLiquidaAnual)} a.a.`}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-border bg-muted/20 p-bloco text-xs sm:grid-cols-4">
        <Item rotulo="Rentabilidade estimada" valor={`${fmtPct(taxa)} a.a.`} />
        <Item
          rotulo={`IR (${fmtNum(aliquotaIr(dias) * 100, 1)}%)`}
          valor={`- ${fmtBRL(resultado.ir)}`}
        />
        <Item rotulo="Custódia B3 (0,20% a.a.)" valor={`- ${fmtBRL(resultado.custodia)}`} />
        <Item rotulo="IOF" valor={resultado.iof > 0 ? `- ${fmtBRL(resultado.iof)}` : "Isento"} />
        {resultado.percentualCdi !== null ? (
          <Item
            rotulo="Equivalente ao CDI"
            valor={`${fmtNum(resultado.percentualCdi, 0)}% do CDI`}
          />
        ) : null}
        {linha.tipo === "SELIC" ? <Item rotulo="Custódia" valor="Isenta até R$ 10 mil" /> : null}
      </dl>

      <p className="t-caption">
        Projeção informativa. Títulos indexados usam o IPCA acumulado em 12 meses e a Selic atual
        como referência futura; o resultado real depende da inflação e dos juros ao longo do
        período.
      </p>
    </div>
  );
}

function Metrica({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-bloco ${destaque ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
    >
      <TextoTruncado as="p" className="t-label block">
        {rotulo}
      </TextoTruncado>
      <TextoTruncado
        as="p"
        className={`t-num mt-1 block font-semibold ${destaque ? "text-primary" : ""}`}
      >
        {valor}
      </TextoTruncado>
      {detalhe ? <p className="t-caption">{detalhe}</p> : null}
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium tabular-nums">{valor}</dd>
    </div>
  );
}
