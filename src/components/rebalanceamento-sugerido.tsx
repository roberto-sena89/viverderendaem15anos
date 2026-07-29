import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { alocacaoIdeal, brl, classeDoAtivo, pct, valorAtual } from "@/lib/portfolio";
import type { Ativo } from "@/lib/portfolio";

type Ordem = {
  classe: string;
  acao: "Comprar" | "Vender" | "Manter";
  valor: number;
  desvio: number;
  ativos: { ticker: string; valor: number }[];
};

/** Distribui um valor dentro da classe, priorizando os ativos com menor peso relativo. */
function distribuirNaClasse(ativos: Ativo[], valor: number) {
  if (valor <= 0 || ativos.length === 0) return [];
  const total = ativos.reduce((s, a) => s + valorAtual(a), 0);
  const pesoAlvo = 1 / ativos.length;
  const gaps = ativos.map((a) => ({
    ticker: a.ticker,
    gap: Math.max(pesoAlvo - (total > 0 ? valorAtual(a) / total : 0), 0.0001),
  }));
  const somaGap = gaps.reduce((s, g) => s + g.gap, 0);
  return gaps
    .map((g) => ({ ticker: g.ticker, valor: (valor * g.gap) / somaGap }))
    .filter((g) => g.valor >= 1)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3);
}

/**
 * Plano de rebalanceamento: compara alocação atual x alvo e sugere
 * as ordens necessárias, considerando um novo aporte opcional.
 */
export function RebalanceamentoSugerido({ carteira }: { carteira: Ativo[] }) {
  const [aporteTexto, setAporteTexto] = useState("");
  const aporte = Math.max(0, Number(aporteTexto.replace(",", ".")) || 0);

  const { ordens, totalAtual, totalFuturo, semVenda } = useMemo(() => {
    const total = carteira.reduce((s, a) => s + valorAtual(a), 0);
    const futuro = total + aporte;

    const porClasse: Record<string, Ativo[]> = {};
    for (const classe of Object.keys(alocacaoIdeal)) porClasse[classe] = [];
    for (const a of carteira) porClasse[classeDoAtivo(a)].push(a);

    const base = Object.entries(alocacaoIdeal).map(([classe, alvoPct]) => {
      const atualValor = porClasse[classe].reduce((s, a) => s + valorAtual(a), 0);
      const alvoValor = (futuro * alvoPct) / 100;
      return { classe, alvoPct, atualValor, alvoValor, delta: alvoValor - atualValor };
    });

    // Com aporte, prioriza somente compras: o dinheiro novo vai para as classes abaixo do alvo.
    const faltando = base.filter((b) => b.delta > 0);
    const somaFalta = faltando.reduce((s, b) => s + b.delta, 0);
    const podeSoComprar = aporte > 0 && somaFalta > 0 && aporte >= somaFalta * 0.999;

    const lista: Ordem[] = base
      .map((b) => {
        let acao: Ordem["acao"] = "Manter";
        let valor = 0;

        if (aporte > 0 && !podeSoComprar) {
          // aporte insuficiente para zerar o gap: distribui proporcionalmente ao déficit
          if (b.delta > 0) {
            acao = "Comprar";
            valor = (aporte * b.delta) / somaFalta;
          }
        } else if (b.delta > 0) {
          acao = "Comprar";
          valor = b.delta;
        } else if (b.delta < 0 && aporte === 0) {
          acao = "Vender";
          valor = -b.delta;
        }

        const relevante = futuro > 0 ? Math.abs(valor / futuro) * 100 : 0;
        if (relevante < 0.5) {
          acao = "Manter";
          valor = 0;
        }

        return {
          classe: b.classe,
          acao,
          valor,
          desvio: futuro > 0 ? (b.atualValor / futuro) * 100 - b.alvoPct : 0,
          ativos: acao === "Comprar" ? distribuirNaClasse(porClasse[b.classe], valor) : [],
        };
      })
      .sort((a, b) => b.valor - a.valor);

    return { ordens: lista, totalAtual: total, totalFuturo: futuro, semVenda: aporte > 0 };
  }, [carteira, aporte]);

  const comprar = ordens.filter((o) => o.acao === "Comprar");
  const vender = ordens.filter((o) => o.acao === "Vender");
  const equilibrada = comprar.length === 0 && vender.length === 0;

  return (
    <Panel
      title="Rebalanceamento recomendado"
      action={
        <div className="flex items-center gap-2">
          <Label htmlFor="aporte-rebal" className="text-xs whitespace-nowrap text-muted-foreground">
            Novo aporte (R$)
          </Label>
          <Input
            id="aporte-rebal"
            inputMode="decimal"
            placeholder="0,00"
            value={aporteTexto}
            onChange={(e) => setAporteTexto(e.target.value)}
            className="h-9 w-32 text-xs"
          />
        </div>
      }
    >
      {totalAtual === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Cadastre ativos na carteira para receber sugestões de rebalanceamento.
        </p>
      ) : (
        <>
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Sparkles className="mt-px size-8! shrink-0 text-primary" />
            <span>
              {aporte > 0 ? (
                <>
                  Aportando <strong className="text-foreground">{brl(aporte, 2)}</strong>, a carteira passa a{" "}
                  <strong className="text-foreground">{brl(totalFuturo, 2)}</strong>. As ordens abaixo direcionam o
                  novo dinheiro para as classes abaixo do alvo — {semVenda ? "sem precisar vender nada" : "sem vendas"}.
                </>
              ) : (
                <>
                  Sem aporte novo, o equilíbrio exige realocar entre classes. Informe um valor de aporte ao lado para
                  ver um plano só de compras.
                </>
              )}
            </span>
          </p>

          {equilibrada ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-success">
              <CheckCircle2 className="size-8!" /> Carteira dentro do alvo — nenhuma ordem necessária.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classe</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="text-right">Desvio do alvo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Sugestão de ativos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordens
                    .filter((o) => o.acao !== "Manter")
                    .map((o) => (
                      <TableRow key={o.classe}>
                        <TableCell className="font-medium">{o.classe}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              o.acao === "Comprar"
                                ? "bg-success text-success-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }
                          >
                            {o.acao === "Comprar" ? (
                              <ArrowUpRight className="mr-1 size-8!" />
                            ) : (
                              <ArrowDownRight className="mr-1 size-8!" />
                            )}
                            {o.acao}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`num text-right ${o.desvio < 0 ? "text-destructive" : "text-success"}`}
                        >
                          {pct(o.desvio)}
                        </TableCell>
                        <TableCell className="num text-right font-semibold">{brl(o.valor, 2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.ativos.length > 0
                            ? o.ativos.map((a) => `${a.ticker} ${brl(a.valor, 2)}`).join(" · ")
                            : o.acao === "Comprar"
                              ? "Sem ativos nesta classe — escolha um novo papel"
                              : "Reduzir posições desta classe"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
