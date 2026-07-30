import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { useAtivos } from "@/lib/data";
import { corClasse } from "@/lib/cores-ativos";
import { alocacaoIdeal, brl, classeDoAtivo, pct, valorAtual } from "@/lib/portfolio";

type Linha = { indexador: string; prazo: string; alvo: number };
type Bloco = { grupo: string; risco: string; linhas: Linha[] };
type Ordem = {
  classe: string;
  ticker: string;
  nome: string;
  acao: "Comprar" | "Vender";
  preco: number;
  quantidade: number;
  valor: number;
};

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
      { indexador: "ETF - Brasil", prazo: "BOVA11 ou Trend Bolsa Brasileira", alvo: 20 },
      { indexador: "ETF - Global", prazo: "IVVB11 ou Trend Bolsa Americana (sem o dólar)", alvo: 20 },
      { indexador: "FIIS (Fundos Imobiliários)", prazo: "MCRE11 (Mauá Capital Real Estate)", alvo: 2 },
      { indexador: "FIIS (Fundos Imobiliários)", prazo: "TRXF11 (TRX Real Estate)", alvo: 2 },
      { indexador: "FIIS (Fundos Imobiliários)", prazo: "MXRF11 (Maxi Renda)", alvo: 2 },
      { indexador: "FIIS (Fundos Imobiliários)", prazo: "XPML11 (BTG Pactual Shoppings)", alvo: 2 },
      { indexador: "FIIS (Fundos Imobiliários)", prazo: "BTLG11 (Kinea Renda Imobiliária)", alvo: 2 },
    ],
  },
];

export function CarteiraRecomendada() {
  const total = BLOCOS.reduce((s, b) => s + b.linhas.reduce((x, l) => x + l.alvo, 0), 0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { salvar } = useAlocacaoAlvo();
  const { data: carteira = [] } = useAtivos();

  const { impacto, patrimonio, ordens } = useMemo(() => {
    const patrimonio = carteira.reduce((s, a) => s + valorAtual(a), 0);
    const porClasse: Record<string, typeof carteira> = {};
    const atualPorClasse: Record<string, number> = {};
    for (const a of carteira) {
      const classe = classeDoAtivo(a);
      atualPorClasse[classe] = (atualPorClasse[classe] ?? 0) + valorAtual(a);
      (porClasse[classe] ??= []).push(a);
    }
    const impacto = Object.entries(alocacaoIdeal)
      .map(([classe, alvoPct]) => {
        const atualValor = atualPorClasse[classe] ?? 0;
        const atualPct = patrimonio > 0 ? (atualValor / patrimonio) * 100 : 0;
        const alvoValor = (patrimonio * alvoPct) / 100;
        return { classe, atualPct, alvoPct, delta: alvoValor - atualValor };
      })
      .filter((l) => l.alvoPct > 0 || Math.abs(l.delta) > 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Detalha as ordens por ativo: rateia o ajuste da classe entre os papéis existentes,
    // proporcionalmente ao valor de cada posição.
    const ordens: Ordem[] = [];
    for (const linha of impacto) {
      if (Math.abs(linha.delta) < 0.5) continue;
      const ativos = porClasse[linha.classe] ?? [];
      const totalClasse = ativos.reduce((s, a) => s + valorAtual(a), 0);
      if (ativos.length === 0 || totalClasse <= 0) {
        if (linha.delta > 0) {
          ordens.push({
            classe: linha.classe,
            ticker: "—",
            nome: "Sem posição nesta classe — escolha um novo papel",
            acao: "Comprar",
            preco: 0,
            quantidade: 0,
            valor: linha.delta,
          });
        }
        continue;
      }
      for (const a of ativos) {
        const peso = valorAtual(a) / totalClasse;
        const valor = linha.delta * peso;
        if (Math.abs(valor) < 0.5) continue;
        const bruta = a.precoAtual > 0 ? Math.abs(valor) / a.precoAtual : 0;
        const quantidade = Math.max(bruta >= 1 ? Math.floor(bruta) : Number(bruta.toFixed(4)), 0);
        ordens.push({
          classe: linha.classe,
          ticker: a.ticker,
          nome: a.nome,
          acao: valor > 0 ? "Comprar" : "Vender",
          preco: a.precoAtual,
          quantidade: valor < 0 ? Math.min(quantidade, a.quantidade) : quantidade,
          valor: Math.abs(valor),
        });
      }
    }
    ordens.sort((a, b) => b.valor - a.valor);

    return { impacto, patrimonio, ordens };
  }, [carteira]);


  const totalCompras = impacto.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
  const totalVendas = impacto.filter((l) => l.delta < 0).reduce((s, l) => s - l.delta, 0);

  function aplicar() {
    salvar({ ...alocacaoIdeal });
    setOpen(false);
    toast.success("Alocação-alvo atualizada com a carteira recomendada.");
    navigate({ to: "/rebalanceamento" });
  }

  return (
    <Panel
      title="Carteira recomendada"
      hint="Perfil agressivo · referência de alocação-alvo por classe de ativo"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-display text-xs font-bold tracking-wide text-accent-foreground uppercase">
            Total {total}%
          </span>
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}>
            <Wand2 className="size-4" /> Aplicar recomendações
          </Button>
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Carteira recomendada">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-[0.875rem] tracking-wider text-muted-foreground uppercase">
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
                  key={`${bloco.grupo}-${linha.indexador}-${linha.prazo}-${i}`}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicar carteira recomendada</DialogTitle>
            <DialogDescription>
              Sua alocação-alvo passa a seguir o perfil agressivo. Veja abaixo o impacto estimado sobre o patrimônio
              atual de {brl(patrimonio, 2)}.
            </DialogDescription>
          </DialogHeader>

          {patrimonio === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Cadastre ativos na carteira para ver o impacto estimado. Você ainda pode aplicar os alvos recomendados.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Total a comprar</span>
                  <p className="num font-display text-lg font-bold text-success">{brl(totalCompras, 2)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Total a reduzir</span>
                  <p className="num font-display text-lg font-bold text-destructive">{brl(totalVendas, 2)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-[0.875rem] tracking-wider text-muted-foreground uppercase">
                      <th className="px-3 py-2 text-left font-semibold">Classe</th>
                      <th className="px-3 py-2 text-right font-semibold">Atual</th>
                      <th className="px-3 py-2 text-right font-semibold">Alvo</th>
                      <th className="px-3 py-2 text-right font-semibold">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impacto.map((l) => (
                      <tr key={l.classe} className="border-t border-border">
                        <td className="px-3 py-2 font-medium whitespace-pre-line">
                          <span className="inline-flex items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corClasse(l.classe) }} />
                            {l.classe}
                          </span>
                        </td>
                        <td className="num px-3 py-2 text-right text-muted-foreground">{pct(l.atualPct)}</td>
                        <td className="num px-3 py-2 text-right">{pct(l.alvoPct)}</td>
                        <td
                          className={`num px-3 py-2 text-right font-semibold ${
                            Math.abs(l.delta) < 0.5
                              ? "text-muted-foreground"
                              : l.delta > 0
                                ? "text-success"
                                : "text-destructive"
                          }`}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            {Math.abs(l.delta) < 0.5 ? (
                              <Minus className="size-3.5" />
                            ) : l.delta > 0 ? (
                              <ArrowUpRight className="size-3.5" />
                            ) : (
                              <ArrowDownRight className="size-3.5" />
                            )}
                            {brl(Math.abs(l.delta), 2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                  <span className="font-display text-xs font-bold tracking-wide uppercase">
                    Detalhes por ativo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ordens.length} {ordens.length === 1 ? "ordem estimada" : "ordens estimadas"}
                  </span>
                </div>
                {ordens.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma ordem necessária — a carteira já está próxima da recomendação.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/20 text-[0.875rem] tracking-wider text-muted-foreground uppercase">
                          <th className="px-3 py-2 text-left font-semibold">Ativo</th>
                          <th className="px-3 py-2 text-left font-semibold">Ação</th>
                          <th className="px-3 py-2 text-right font-semibold">Qtd. estimada</th>
                          <th className="px-3 py-2 text-right font-semibold">Preço atual</th>
                          <th className="px-3 py-2 text-right font-semibold">Valor estimado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordens.map((o) => (
                          <tr key={`${o.classe}-${o.ticker}-${o.acao}`} className="border-t border-border">
                            <td className="px-3 py-2">
                              <span className="block font-display font-bold">{o.ticker}</span>
                              <span className="block text-xs whitespace-pre-line text-muted-foreground">
                                {o.nome || o.classe}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  o.acao === "Comprar"
                                    ? "bg-success/15 text-success"
                                    : "bg-destructive/15 text-destructive"
                                }`}
                              >
                                {o.acao === "Comprar" ? (
                                  <ArrowUpRight className="size-3.5" />
                                ) : (
                                  <ArrowDownRight className="size-3.5" />
                                )}
                                {o.acao}
                              </span>
                            </td>
                            <td className="num px-3 py-2 text-right">
                              {o.quantidade > 0
                                ? o.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
                                : "—"}
                            </td>
                            <td className="num px-3 py-2 text-right text-muted-foreground">
                              {o.preco > 0 ? brl(o.preco, 2) : "—"}
                            </td>
                            <td className="num px-3 py-2 text-right font-semibold">{brl(o.valor, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Quantidades estimadas pelo preço atual e arredondadas para baixo — valores podem variar na execução.
                </p>
              </div>
            </>
          )}


          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={aplicar}>Aplicar e rebalancear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>

  );
}
