import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAportes } from "@/lib/data";
import { brl } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";

type Item = { ticker: string; categoria: string; quantidade: number; total: number };
type Mes = { chave: string; rotulo: string; total: number; taxas: number; lancamentos: number; itens: Item[] };

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  const nome = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** Painel discreto com o detalhamento mês a mês dos aportes. */
export function HistoricoMensalAportes() {
  const { data: aportes = [] } = useAportes();
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const meses = useMemo<Mes[]>(() => {
    const mapa = new Map<string, Mes>();
    for (const a of aportes) {
      const chave = a.data.slice(0, 7);
      const total = a.quantidade * a.preco + a.taxas;
      let m = mapa.get(chave);
      if (!m) {
        m = { chave, rotulo: rotuloMes(chave), total: 0, taxas: 0, lancamentos: 0, itens: [] };
        mapa.set(chave, m);
      }
      m.total += total;
      m.taxas += a.taxas;
      m.lancamentos += 1;
      const item = m.itens.find((i) => i.ticker === a.ticker);
      if (item) {
        item.quantidade += a.quantidade;
        item.total += total;
      } else {
        m.itens.push({ ticker: a.ticker, categoria: a.categoria, quantidade: a.quantidade, total });
      }
    }
    return [...mapa.values()]
      .sort((a, b) => (a.chave < b.chave ? 1 : -1))
      .map((m) => ({ ...m, itens: m.itens.sort((a, b) => b.total - a.total) }));
  }, [aportes]);

  const maior = Math.max(1, ...meses.map((m) => m.total));
  const totalGeral = meses.reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="gap-2 text-xs font-semibold tracking-[0.04em] uppercase"
      >
        <CalendarRange className="size-4" />
        Aportes mês a mês
        <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </Button>

      {aberto && (
        <div className="panel max-w-2xl p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.7rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Detalhamento mensal
            </p>
            <p className="num text-xs text-muted-foreground">
              {meses.length} {meses.length === 1 ? "mês" : "meses"} · {brl(totalGeral)}
            </p>
          </div>

          <div className="mt-3 divide-y divide-border">
            {meses.map((m) => {
              const aberta = expandido === m.chave;
              return (
                <div key={m.chave} className="py-2">
                  <button
                    type="button"
                    onClick={() => setExpandido(aberta ? null : m.chave)}
                    aria-expanded={aberta}
                    className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-muted/50"
                  >
                    {aberta ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="w-36 shrink-0 truncate text-sm font-medium">{m.rotulo}</span>
                    <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${(m.total / maior) * 100}%` }}
                      />
                    </span>
                    <span className="ml-auto text-right">
                      <span className="num block text-sm font-semibold">{brl(m.total)}</span>
                      <span className="block text-[0.65rem] text-muted-foreground">
                        {m.lancamentos} {m.lancamentos === 1 ? "lançamento" : "lançamentos"}
                      </span>
                    </span>
                  </button>

                  {aberta && (
                    <ul className="mt-2 space-y-1 pl-7">
                      {m.itens.map((i) => (
                        <li key={i.ticker} className="flex items-center gap-2 text-xs">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: corCategoria(i.categoria) }}
                          />
                          <span className="font-medium">{i.ticker}</span>
                          <span className="truncate text-muted-foreground">{i.categoria}</span>
                          <span className="num ml-auto text-muted-foreground">
                            {i.quantidade.toLocaleString("pt-BR")} un.
                          </span>
                          <span className="num w-24 text-right font-medium">{brl(i.total)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between pt-1 text-[0.68rem] text-muted-foreground">
                        <span>Taxas do mês</span>
                        <span className="num">{brl(m.taxas, 2)}</span>
                      </li>
                    </ul>
                  )}
                </div>
              );
            })}
            {meses.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhum aporte registrado ainda.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
