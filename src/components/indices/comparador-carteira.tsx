import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Panel } from "@/components/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corVariacao, fmtNum } from "@/components/indices/card-indice";
import type { LinhaIndice } from "@/lib/indices-base";
import { useAtivos } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Compara a rentabilidade acumulada da carteira do usuário (preço médio ->
 * preço atual) com a variação em 12 meses do índice de referência escolhido.
 */
export function ComparadorCarteira({ linhas }: { linhas: LinhaIndice[] }) {
  const { data: ativos } = useAtivos();
  const referencias = useMemo(() => linhas.filter((l) => l.variacao12m !== null), [linhas]);
  const [codigo, setCodigo] = useState("IBOV");
  const indice = referencias.find((l) => l.codigo === codigo) ?? referencias[0] ?? null;

  const carteira = useMemo(() => {
    const lista = ativos ?? [];
    let custo = 0;
    let atual = 0;
    for (const a of lista) {
      custo += a.quantidade * a.precoMedio;
      atual += a.quantidade * (a.precoAtual || a.precoMedio);
    }
    return custo > 0 ? ((atual - custo) / custo) * 100 : null;
  }, [ativos]);

  const referencia = indice?.variacao12m ?? null;
  const diferenca = carteira !== null && referencia !== null ? carteira - referencia : null;

  const barra = (valor: number | null) => {
    const maximo = Math.max(Math.abs(carteira ?? 0), Math.abs(referencia ?? 0), 1);
    return valor === null ? 0 : Math.min(100, (Math.abs(valor) / maximo) * 100);
  };

  return (
    <Panel
      title="Sua carteira vs. índice de referência"
      hint="Rentabilidade acumulada da carteira (preço médio → preço atual) comparada à variação em 12 meses do índice."
      action={
        <Select value={indice?.codigo ?? ""} onValueChange={setCodigo}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Índice" />
          </SelectTrigger>
          <SelectContent>
            {referencias.map((l) => (
              <SelectItem key={l.codigo} value={l.codigo} className="text-xs">
                {l.codigo} · {l.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-3">
          {[
            { rotulo: "Sua carteira", valor: carteira, cor: "bg-primary" },
            {
              rotulo: indice ? `${indice.codigo} (12m)` : "Índice",
              valor: referencia,
              cor: "bg-muted-foreground/60",
            },
          ].map((item) => (
            <div key={item.rotulo}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.rotulo}</span>
                <span className={cn("font-display tabular-nums", corVariacao(item.valor))}>
                  {item.valor === null ? "—" : `${item.valor > 0 ? "+" : ""}${fmtNum(item.valor)}%`}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full transition-all", item.cor)}
                  style={{ width: `${barra(item.valor)}%` }}
                />
              </div>
            </div>
          ))}

          <p className="text-sm">
            {diferenca === null ? (
              <span className="text-muted-foreground">
                Registre aportes na carteira para comparar sua rentabilidade com o índice.
              </span>
            ) : (
              <span
                className={cn("inline-flex items-center gap-1 font-medium", corVariacao(diferenca))}
              >
                {diferenca >= 0 ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <ArrowDownRight className="size-4" />
                )}
                {diferenca >= 0 ? "Sua carteira está à frente" : "Sua carteira está atrás"} do{" "}
                {indice?.codigo} em {fmtNum(Math.abs(diferenca))} p.p.
              </span>
            )}
          </p>
        </div>

        {indice ? (
          <div className="min-w-0">
            <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">
              Curva do {indice.codigo}
            </p>
            <Sparkline
              serie={indice.spark}
              positivo={(indice.variacao12m ?? 0) >= 0}
              largura={320}
              altura={92}
              className="mt-2 w-full"
            />
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
