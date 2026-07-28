import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, carteira, pct, totalAtual, valorAtual, valorInvestido } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira · Investidor em 15 Anos" },
      { name: "description", content: "Tabela completa da carteira com preço médio, lucro, rentabilidade, dividend yield e participação." },
      { property: "og:title", content: "Carteira · Investidor em 15 Anos" },
      { property: "og:description", content: "Todos os seus ativos consolidados por categoria em uma única tabela." },
    ],
  }),
  component: CarteiraPage,
});

const filtros = ["Todos", "Ações", "FIIs", "ETF Brasil", "ETF EUA", "Renda Fixa", "Tesouro"] as const;

function CarteiraPage() {
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos");
  const ativos = carteira.filter((a) => filtro === "Todos" || a.categoria === filtro);

  return (
    <AppShell title="Carteira" description={`${carteira.length} ativos · ${brl(totalAtual)}`}>
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
            {f}
          </Button>
        ))}
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Preço médio</TableHead>
              <TableHead className="text-right">Preço atual</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">Rent.</TableHead>
              <TableHead className="text-right">DY</TableHead>
              <TableHead className="text-right">Part.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ativos.map((a) => {
              const lucro = valorAtual(a) - valorInvestido(a);
              const rent = (lucro / valorInvestido(a)) * 100;
              return (
                <TableRow key={a.ticker}>
                  <TableCell className="font-medium">{a.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{a.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{a.quantidade.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{brl(a.precoMedio, 2)}</TableCell>
                  <TableCell className="text-right">{brl(a.precoAtual, 2)}</TableCell>
                  <TableCell className={`text-right ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(lucro)}</TableCell>
                  <TableCell className={`text-right ${rent >= 0 ? "text-success" : "text-destructive"}`}>{pct(rent)}</TableCell>
                  <TableCell className="text-right">{pct(a.dy)}</TableCell>
                  <TableCell className="text-right">{pct((valorAtual(a) / totalAtual) * 100)}</TableCell>
                </TableRow>
              );
            })}
            {ativos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum ativo nesta categoria ainda.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
