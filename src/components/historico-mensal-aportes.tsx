import { Fragment, useMemo, useState } from "react";
import { CalendarRange, Check, ChevronDown, ChevronRight, Pencil, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAportes, useAtivos, useAtualizarAporte, useExcluirAporte } from "@/lib/data";
import { brl, type Aporte } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";

type Item = {
  ticker: string;
  categoria: string;
  corretoras: string[];
  datas: string[];
  quantidade: number;
  bruto: number;
  taxas: number;
  total: number;
  lancamentos: number;
  registros: Aporte[];
};

type Mes = {
  chave: string;
  rotulo: string;
  bruto: number;
  taxas: number;
  total: number;
  lancamentos: number;
  itens: Item[];
  categorias: Map<string, number>;
  corretoras: Set<string>;
};

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  const nome = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

function dataCurta(iso: string) {
  return new Date(`${iso}T12:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function intervalo(datas: string[]) {
  if (datas.length === 0) return "—";
  const ord = [...datas].sort();
  const ini = dataCurta(ord[0]);
  const fim = dataCurta(ord[ord.length - 1]);
  return ini === fim ? ini : `${ini} – ${fim}`;
}

/** Painel discreto e detalhado com o histórico mês a mês dos aportes. */
export function HistoricoMensalAportes() {
  const { data: aportes = [] } = useAportes();
  const { data: carteira = [] } = useAtivos();
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  /** Categoria oficial de cada ticker vem da aba Carteira (fonte única). */
  const categoriaPorTicker = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of carteira) m.set(a.ticker.toUpperCase(), a.categoria);
    return m;
  }, [carteira]);

  const meses = useMemo<Mes[]>(() => {
    const mapa = new Map<string, Mes>();
    for (const a of aportes) {
      const ticker = a.ticker.toUpperCase();
      const categoria = categoriaPorTicker.get(ticker) ?? a.categoria;
      const chave = a.data.slice(0, 7);
      const bruto = a.quantidade * a.preco;
      const total = bruto + a.taxas;
      let m = mapa.get(chave);

      if (!m) {
        m = {
          chave,
          rotulo: rotuloMes(chave),
          bruto: 0,
          taxas: 0,
          total: 0,
          lancamentos: 0,
          itens: [],
          categorias: new Map(),
          corretoras: new Set(),
        };
        mapa.set(chave, m);
      }
      m.bruto += bruto;
      m.taxas += a.taxas;
      m.total += total;
      m.lancamentos += 1;
      m.categorias.set(categoria, (m.categorias.get(categoria) ?? 0) + total);
      if (a.corretora) m.corretoras.add(a.corretora);

      const item = m.itens.find((i) => i.ticker === ticker);
      if (item) {
        item.quantidade += a.quantidade;
        item.bruto += bruto;
        item.taxas += a.taxas;
        item.total += total;
        item.lancamentos += 1;
        item.datas.push(a.data);
        item.categoria = categoria;
        if (a.corretora && !item.corretoras.includes(a.corretora)) item.corretoras.push(a.corretora);
        item.registros.push(a);
      } else {
        m.itens.push({
          ticker,
          categoria,
          corretoras: a.corretora ? [a.corretora] : [],
          datas: [a.data],
          quantidade: a.quantidade,
          bruto,
          taxas: a.taxas,
          total,
          lancamentos: 1,
          registros: [a],
        });
      }
    }
    return [...mapa.values()]
      .sort((a, b) => (a.chave < b.chave ? 1 : -1))
      .map((m) => ({ ...m, itens: m.itens.sort((a, b) => b.total - a.total) }));
  }, [aportes, categoriaPorTicker]);
  const atualizar = useAtualizarAporte();
  const excluir = useExcluirAporte();
  const [linhaAberta, setLinhaAberta] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState({ data: "", corretora: "", ticker: "", quantidade: "", preco: "", taxas: "" });

  function iniciarEdicao(a: Aporte) {
    setEditando(a.id);
    setForm({
      data: a.data,
      corretora: a.corretora ?? "",
      ticker: a.ticker,
      quantidade: String(a.quantidade),
      preco: String(a.preco),
      taxas: String(a.taxas),
    });
  }

  async function salvar(a: Aporte) {
    const quantidade = Number(form.quantidade.replace(",", "."));
    const preco = Number(form.preco.replace(",", "."));
    const taxas = Number(form.taxas.replace(",", ".")) || 0;
    if (!form.ticker.trim() || !form.data || !Number.isFinite(quantidade) || !Number.isFinite(preco)) {
      toast.error("Preencha ticker, data, quantidade e preço válidos.");
      return;
    }
    try {
      await atualizar.mutateAsync({
        id: a.id,
        data: form.data,
        corretora: form.corretora.trim(),
        ticker: form.ticker.trim().toUpperCase(),
        categoria: a.categoria,
        quantidade,
        preco,
        taxas,
        observacoes: a.observacoes ?? undefined,
      });
      setEditando(null);
      toast.success("Lançamento atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  async function remover(a: Aporte) {
    try {
      await excluir.mutateAsync(a.id);
      toast.success("Lançamento excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  const maior = Math.max(1, ...meses.map((m) => m.total));
  const totalGeral = meses.reduce((s, m) => s + m.total, 0);
  const taxasGerais = meses.reduce((s, m) => s + m.taxas, 0);
  const mediaMensal = meses.length ? totalGeral / meses.length : 0;

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
        <div className="panel max-w-4xl p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[0.82rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Detalhamento mensal dos aportes
            </p>
            <p className="num text-xs text-muted-foreground">
              {meses.length} {meses.length === 1 ? "mês" : "meses"} · média {brl(mediaMensal)}
            </p>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { r: "Valor aplicado", v: brl(totalGeral) },
              { r: "Taxas acumuladas", v: brl(taxasGerais, 2) },
              { r: "Lançamentos", v: String(meses.reduce((s, m) => s + m.lancamentos, 0)) },
              { r: "Média por mês", v: brl(mediaMensal) },
            ].map((k) => (
              <div key={k.r} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <dt className="text-[0.85rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{k.r}</dt>
                <dd className="num mt-0.5 text-sm font-semibold">{k.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 divide-y divide-border">
            {meses.map((m, idx) => {
              const aberta = expandido === m.chave;
              const anterior = meses[idx + 1];
              const variacao = anterior && anterior.total > 0 ? (m.total / anterior.total - 1) * 100 : null;
              const topo = [...m.categorias.entries()].sort((a, b) => b[1] - a[1])[0];
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
                    <span className="w-36 shrink-0 truncate">
                      <span className="block text-sm font-medium">{m.rotulo}</span>
                      <span className="block truncate text-[0.78rem] text-muted-foreground">
                        {topo ? `${topo[0].replace(/\n/g, " · ")}` : "—"}
                      </span>
                    </span>
                    <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${(m.total / maior) * 100}%` }}
                      />
                    </span>
                    {variacao !== null && (
                      <span
                        className={`num hidden items-center gap-1 text-[0.875rem] font-semibold sm:flex ${
                          variacao >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {variacao >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {variacao >= 0 ? "+" : ""}
                        {variacao.toFixed(1)}%
                      </span>
                    )}
                    <span className="ml-auto text-right">
                      <span className="num block text-sm font-semibold">{brl(m.total)}</span>
                      <span className="block text-[0.78rem] text-muted-foreground">
                        {m.lancamentos} {m.lancamentos === 1 ? "lançamento" : "lançamentos"} · {m.itens.length}{" "}
                        {m.itens.length === 1 ? "ativo" : "ativos"}
                      </span>
                    </span>
                  </button>

                  {aberta && (
                    <div className="mt-2 space-y-2 pl-7">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-[0.85rem] tracking-[0.06em] text-muted-foreground uppercase">
                              <th className="py-1.5 pr-2 text-left font-semibold">DATA</th>
                              <th className="py-1.5 pr-2 text-left font-semibold">Ativo</th>
                              <th className="py-1.5 pr-2 text-left font-semibold">Categoria</th>
                              <th className="py-1.5 pr-2 text-left font-semibold">Corretora</th>
                              <th className="py-1.5 pr-2 text-right font-semibold">Qtd.</th>
                              <th className="py-1.5 pr-2 text-right font-semibold">Preço médio</th>
                              <th className="py-1.5 pr-2 text-right font-semibold">Taxas</th>
                              <th className="py-1.5 pr-2 text-right font-semibold">Valor aplicado</th>
                              <th className="py-1.5 text-right font-semibold">Editar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {m.itens.map((i) => {
                              const chaveLinha = `${m.chave}:${i.ticker}`;
                              const linhaAbertaAtual = linhaAberta === chaveLinha;
                              return (
                              <Fragment key={chaveLinha}>
                              <tr>
                                <td className="num py-1.5 pr-2 whitespace-nowrap text-muted-foreground">
                                  {intervalo(i.datas)}
                                </td>
                                <td className="py-1.5 pr-2">
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="size-2 shrink-0 rounded-full"
                                      style={{ background: corCategoria(i.categoria) }}
                                    />
                                    <span className="font-medium">{i.ticker}</span>
                                  </span>
                                </td>
                                <td className="py-1.5 pr-2 text-muted-foreground">
                                  {i.categoria.replace(/\n/g, " · ")}
                                </td>
                                <td className="py-1.5 pr-2 text-muted-foreground">
                                  {i.corretoras.length ? i.corretoras.join(", ") : "—"}
                                </td>
                                <td className="num py-1.5 pr-2 text-right">
                                  {i.quantidade.toLocaleString("pt-BR")}
                                </td>
                                <td className="num py-1.5 pr-2 text-right">
                                  {brl(i.quantidade ? i.bruto / i.quantidade : 0, 2)}
                                </td>
                                <td className="num py-1.5 pr-2 text-right text-muted-foreground">{brl(i.taxas, 2)}</td>
                                <td className="num py-1.5 text-right font-semibold">{brl(i.total)}</td>
                                <td className="py-1.5 pl-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Editar lançamentos de ${i.ticker}`}
                                    aria-expanded={linhaAbertaAtual}
                                    onClick={() => {
                                      setEditando(null);
                                      setLinhaAberta(linhaAbertaAtual ? null : chaveLinha);
                                    }}
                                    className="h-7 gap-1 px-2 text-[0.78rem]"
                                  >
                                    <Pencil className="size-3.5" />
                                    Editar
                                  </Button>
                                </td>
                              </tr>
                              {linhaAbertaAtual &&
                                i.registros.map((a) => {
                                  const emEdicao = editando === a.id;
                                  return (
                                    <tr key={a.id} className="bg-muted/30">
                                      <td className="py-1.5 pr-2">
                                        {emEdicao ? (
                                          <Input
                                            type="date"
                                            value={form.data}
                                            onChange={(e) => setForm({ ...form, data: e.target.value })}
                                            className="h-7 w-32 text-xs"
                                          />
                                        ) : (
                                          <span className="num text-muted-foreground">{dataCurta(a.data)}</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-2">
                                        {emEdicao ? (
                                          <Input
                                            value={form.ticker}
                                            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                                            className="h-7 w-28 text-xs"
                                          />
                                        ) : (
                                          a.ticker
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-2 text-muted-foreground">
                                        {a.categoria.replace(/\n/g, " · ")}
                                      </td>
                                      <td className="py-1.5 pr-2">
                                        {emEdicao ? (
                                          <Input
                                            value={form.corretora}
                                            onChange={(e) => setForm({ ...form, corretora: e.target.value })}
                                            className="h-7 w-32 text-xs"
                                          />
                                        ) : (
                                          <span className="text-muted-foreground">{a.corretora || "—"}</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-2 text-right">
                                        {emEdicao ? (
                                          <Input
                                            inputMode="decimal"
                                            value={form.quantidade}
                                            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                                            className="num h-7 w-20 text-right text-xs"
                                          />
                                        ) : (
                                          <span className="num">{a.quantidade.toLocaleString("pt-BR")}</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-2 text-right">
                                        {emEdicao ? (
                                          <Input
                                            inputMode="decimal"
                                            value={form.preco}
                                            onChange={(e) => setForm({ ...form, preco: e.target.value })}
                                            className="num h-7 w-24 text-right text-xs"
                                          />
                                        ) : (
                                          <span className="num">{brl(a.preco, 2)}</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-2 text-right">
                                        {emEdicao ? (
                                          <Input
                                            inputMode="decimal"
                                            value={form.taxas}
                                            onChange={(e) => setForm({ ...form, taxas: e.target.value })}
                                            className="num h-7 w-20 text-right text-xs"
                                          />
                                        ) : (
                                          <span className="num text-muted-foreground">{brl(a.taxas, 2)}</span>
                                        )}
                                      </td>
                                      <td className="num py-1.5 text-right font-semibold">
                                        {brl(a.quantidade * a.preco + a.taxas, 2)}
                                      </td>
                                      <td className="py-1.5 pl-2">
                                        <div className="flex justify-end gap-1">
                                          {emEdicao ? (
                                            <>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="default"
                                                aria-label="Salvar lançamento"
                                                disabled={atualizar.isPending}
                                                onClick={() => salvar(a)}
                                                className="size-7"
                                              >
                                                <Check className="size-3.5" />
                                              </Button>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Cancelar edição"
                                                onClick={() => setEditando(null)}
                                                className="size-7"
                                              >
                                                <X className="size-3.5" />
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                aria-label="Editar este lançamento"
                                                onClick={() => iniciarEdicao(a)}
                                                className="size-7"
                                              >
                                                <Pencil className="size-3.5" />
                                              </Button>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Excluir este lançamento"
                                                disabled={excluir.isPending}
                                                onClick={() => remover(a)}
                                                className="size-7 text-destructive"
                                              >
                                                <Trash2 className="size-3.5" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const qtdTotal = m.itens.reduce((s, i) => s + i.quantidade, 0);
                              const pmTotal = qtdTotal ? m.bruto / qtdTotal : 0;
                              return (
                                <tr className="border-t-2 border-border bg-muted/40 text-[0.875rem]">
                                  <td className="py-1.5 pr-2 font-semibold" colSpan={4}>
                                    Totais do mês · {m.lancamentos} {m.lancamentos === 1 ? "lançamento" : "lançamentos"}
                                  </td>
                                  <td className="num py-1.5 pr-2 text-right font-semibold">
                                    {qtdTotal.toLocaleString("pt-BR")}
                                  </td>
                                  <td className="num py-1.5 pr-2 text-right font-semibold">{brl(pmTotal, 2)}</td>
                                  <td className="num py-1.5 pr-2 text-right font-semibold">{brl(m.taxas, 2)}</td>
                                  <td className="num py-1.5 text-right font-bold">{brl(m.total, 2)}</td>
                                  <td />
                                </tr>
                              );
                            })()}
                          </tfoot>

                        </table>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[...m.categorias.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, valor]) => (
                            <span
                              key={cat}
                              className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[0.85rem] text-muted-foreground"
                            >
                              <span
                                className="size-1.5 rounded-full"
                                style={{ background: corCategoria(cat) }}
                              />
                              {cat.replace(/\n/g, " · ")}
                              <span className="num font-semibold text-foreground">
                                {((valor / m.total) * 100).toFixed(1)}%
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
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
