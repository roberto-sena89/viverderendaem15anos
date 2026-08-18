import { useMemo, useState } from "react";
import { Calculator, Eraser, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { corClasse } from "@/lib/cores-ativos";
import { formatarNumeroBR, numeroBR } from "@/lib/formato-numero";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { useSubAlocacaoAlvo } from "@/lib/subalocacao-alvo";
import { brl, classeDoAtivo, CLASSE_POS_FIXADO, pct, valorAtual } from "@/lib/portfolio";
import type { Ativo } from "@/lib/portfolio";

const ATALHOS = [50, 100, 500, 1000, 2000, 5000];
const MIN_APORTE = 1;
const MAX_APORTE = 10_000_000;

const FORMATO_MOEDA = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/;

/** Valida o texto digitado e devolve o valor numérico ou uma mensagem de erro. */
function validarAporte(entrada: string): { valor: number; erro: string | null } {
  const texto = entrada.trim();
  if (!texto) return { valor: 0, erro: null };
  if (!/^[\d.,\s]+$/.test(texto))
    return { valor: 0, erro: "Use apenas números, ponto e vírgula (ex.: 1.500,00)." };
  if (!FORMATO_MOEDA.test(texto.replace(/\s/g, "")))
    return { valor: 0, erro: "Formato inválido. Use o padrão de moeda, ex.: 1.500,00." };

  const normalizado = texto.replace(/\s/g, "").includes(",")
    ? texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    : texto.replace(/\s/g, "");
  const valor = Number(normalizado);

  if (!Number.isFinite(valor)) return { valor: 0, erro: "Valor inválido." };
  if (valor === 0) return { valor: 0, erro: null }; // zerado: sem cálculo e sem erro
  if (valor < MIN_APORTE) return { valor: 0, erro: `O aporte mínimo é ${brl(MIN_APORTE)}.` };
  if (valor > MAX_APORTE) return { valor: 0, erro: `O aporte máximo é ${brl(MAX_APORTE)}.` };

  return { valor: Math.round(valor * 100) / 100, erro: null };
}

/**
 * Calcula, para um aporte informado, quanto investir em cada classe de ativo
 * priorizando as classes que estão abaixo da alocação-alvo (somente compras).
 */
export function DialogAporteMensal({ carteira }: { carteira: Ativo[] }) {
  const { alvo } = useAlocacaoAlvo();
  const { subAlvo } = useSubAlocacaoAlvo();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("1000");
  const [tocado, setTocado] = useState(false);
  const [historico, setHistorico] = useState<string[]>([]);
  /** Valores digitados manualmente por classe (rascunho, antes de recalcular). */
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  /** Valores manuais efetivamente aplicados no cálculo. */
  const [manuais, setManuais] = useState<Record<string, number>>({});

  /** Aplica um novo valor guardando o anterior para permitir desfazer. */
  const aplicar = (novo: string) => {
    setHistorico((h) => [...h, texto]);
    setTocado(false);
    setTexto(novo);
  };

  const desfazer = () => {
    setHistorico((h) => {
      if (h.length === 0) return h;
      setTexto(h[h.length - 1]);
      setTocado(false);
      return h.slice(0, -1);
    });
  };

  /** Converte o rascunho em valores manuais aplicados. */
  const recalcular = () => {
    const novos: Record<string, number> = {};
    for (const [classe, valor] of Object.entries(rascunho)) {
      const n = numeroBR(valor);
      if (valor.trim() !== "" && Number.isFinite(n) && n > 0) novos[classe] = n;
    }
    setManuais(novos);
  };

  const limparManuais = () => {
    setRascunho({});
    setManuais({});
  };

  const { valor: aporte, erro } = validarAporte(texto);
  const mostrarErro = tocado && Boolean(erro);

  const { linhas, totalAtual, totalFuturo, somaManual, restante } = useMemo(() => {
    const atualPorClasse: Record<string, number> = {};
    for (const classe of Object.keys(alvo)) atualPorClasse[classe] = 0;
    for (const a of carteira)
      atualPorClasse[classeDoAtivo(a)] = (atualPorClasse[classeDoAtivo(a)] ?? 0) + valorAtual(a);

    const total = Object.values(atualPorClasse).reduce((s, v) => s + v, 0);
    const futuro = total + aporte;

    const base = Object.entries(alvo).map(([classe, alvoPct]) => {
      const atual = atualPorClasse[classe] ?? 0;
      return { classe, alvoPct, atual, deficit: Math.max((futuro * alvoPct) / 100 - atual, 0) };
    });

    // Valores travados manualmente (limitados ao aporte total).
    const travados: Record<string, number> = {};
    let usado = 0;
    for (const b of base) {
      const m = manuais[b.classe];
      if (m === undefined) continue;
      const v = Math.max(0, Math.min(m, Math.max(aporte - usado, 0)));
      travados[b.classe] = v;
      usado += v;
    }
    const sobra = Math.max(aporte - usado, 0);

    const livres = base.filter((b) => travados[b.classe] === undefined);
    const somaDeficit = livres.reduce((s, b) => s + b.deficit, 0);
    const somaAlvo = livres.reduce((s, b) => s + b.alvoPct, 0) || 100;

    const resultado = base.map((b) => {
      let valor = travados[b.classe] ?? 0;
      if (travados[b.classe] === undefined && sobra > 0) {
        if (somaDeficit <= 0) {
          valor = (sobra * b.alvoPct) / somaAlvo; // já equilibrada: segue o alvo
        } else if (sobra <= somaDeficit) {
          valor = (sobra * b.deficit) / somaDeficit; // cobre os gaps proporcionalmente
        } else {
          valor = b.deficit + ((sobra - somaDeficit) * b.alvoPct) / somaAlvo; // zera gaps e distribui o resto
        }
      }
      const depois = b.atual + valor;
      return {
        classe: b.classe,
        alvoPct: b.alvoPct,
        atualPct: total > 0 ? (b.atual / total) * 100 : 0,
        valor,
        manual: travados[b.classe] !== undefined,
        parte: aporte > 0 ? (valor / aporte) * 100 : 0,
        depoisPct: futuro > 0 ? (depois / futuro) * 100 : 0,
      };
    });

    return {
      linhas: resultado.sort((a, b) => b.valor - a.valor),
      totalAtual: total,
      totalFuturo: futuro,
      somaManual: usado,
      restante: sobra,
    };
  }, [carteira, alvo, aporte, manuais]);

  /** Sub-classes da Renda Fixa com alvo definido e sua fatia do aporte da classe. */
  const subsRendaFixa = useMemo(() => {
    const itens = Object.entries(subAlvo)
      .map(([nome, alvoPct]) => ({ nome, alvoPct: Number(alvoPct) || 0 }))
      .filter((s) => s.alvoPct > 0);
    const soma = itens.reduce((s, i) => s + i.alvoPct, 0);
    return itens.map((s) => ({ ...s, fracao: soma > 0 ? s.alvoPct / soma : 0 }));
  }, [subAlvo]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2 px-4 text-xs font-semibold">
          <Calculator className="size-4!" />
          Calcular aporte mensal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Calculadora de aporte mensal</DialogTitle>
          <DialogDescription>
            Informe quanto pretende investir no próximo mês e veja o valor exato para cada classe,
            priorizando o que está abaixo da alocação ideal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:items-start">
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-2">
              <Label htmlFor="aporte-mensal">Valor do aporte (R$)</Label>
              <Input
                id="aporte-mensal"
                inputMode="decimal"
                maxLength={15}
                placeholder="1.000,00"
                value={texto}
                aria-invalid={mostrarErro}
                aria-describedby="aporte-mensal-ajuda"
                onChange={(e) => {
                  setTocado(true);
                  setTexto(e.target.value);
                }}
                onBlur={() => setTocado(true)}
                className={`h-11 text-right text-base font-semibold ${mostrarErro ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
              />
              <p
                id="aporte-mensal-ajuda"
                className={`text-xs ${mostrarErro ? "text-destructive" : "text-muted-foreground"}`}
              >
                {mostrarErro
                  ? erro
                  : `Entre ${brl(MIN_APORTE)} e ${brl(MAX_APORTE)} · use vírgula para centavos.`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {ATALHOS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-center px-1 text-xs tabular-nums"
                  onClick={() =>
                    aplicar(formatarNumeroBR(Math.min((erro ? 0 : aporte) + v, MAX_APORTE)))
                  }
                >
                  {brl(v)}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 border border-border text-xs"
                disabled={historico.length === 0}
                onClick={desfazer}
              >
                <Undo2 className="size-3.5" />
                Desfazer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 border border-border text-xs"
                disabled={aporte === 0 && !erro}
                onClick={() => aplicar("0,00")}
              >
                <Eraser className="size-3.5" />
                Zerar
              </Button>
            </div>

            <dl className="space-y-2 border-t border-border pt-3 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Carteira hoje</dt>
                <dd className="num font-semibold">{brl(totalAtual, 2)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Aporte</dt>
                <dd className="num font-semibold text-primary">{brl(aporte, 2)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Depois do aporte</dt>
                <dd className="num font-semibold">{brl(totalFuturo, 2)}</dd>
              </div>
            </dl>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Distribuição por compras — nada precisa ser vendido.
            </p>
          </div>

          {mostrarErro ? (
            <p className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Corrija o valor informado para ver a distribuição.
            </p>
          ) : (
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <div className="text-[11px] leading-tight text-muted-foreground">
                  <p className="font-semibold text-foreground">Aporte manual por classe</p>
                  <p>
                    Travado:{" "}
                    <span className="num font-semibold text-foreground">{brl(somaManual, 2)}</span>{" "}
                    · Restante distribuído:{" "}
                    <span className="num font-semibold text-foreground">{brl(restante, 2)}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 border border-border text-xs"
                    disabled={
                      Object.keys(manuais).length === 0 && Object.keys(rascunho).length === 0
                    }
                    onClick={limparManuais}
                  >
                    Limpar manuais
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={recalcular}
                  >
                    <RefreshCw className="size-3.5" />
                    Recalcular
                  </Button>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(0,1fr)_5rem_6.5rem_5rem] gap-3 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
                <span>Classe</span>
                <span className="text-right">Alvo / Atual</span>
                <span className="text-right">Aportar</span>
                <span className="text-right">Depois</span>
              </div>

              <ul className="space-y-1.5">
                {linhas
                  .filter((l) => l.alvoPct > 0 || l.atualPct > 0)
                  .map((l) => (
                    <li
                      key={l.classe}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-border/70 bg-card px-3 py-2 sm:grid-cols-[minmax(0,1fr)_5rem_6.5rem_5rem]"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: corClasse(l.classe) }}
                        />
                        <span className="min-w-0 truncate" title={l.classe}>
                          {l.classe}
                        </span>
                      </span>
                      <span className="num order-3 text-left text-xs text-muted-foreground sm:order-none sm:text-right">
                        {pct(l.alvoPct)} / {pct(l.atualPct)}
                      </span>
                      <span className="num text-right text-sm font-semibold">
                        {brl(l.valor, 2)}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          ({pct(l.parte)})
                        </span>
                      </span>
                      <span className="num order-4 text-right text-xs text-muted-foreground sm:order-none">
                        {pct(l.depoisPct)}
                      </span>

                      <div className="order-6 col-span-full flex items-center justify-end gap-2 sm:order-none">
                        <Label
                          htmlFor={`manual-${l.classe}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          Manual R$
                        </Label>
                        <Input
                          id={`manual-${l.classe}`}
                          inputMode="decimal"
                          placeholder="0,00"
                          value={rascunho[l.classe] ?? ""}
                          onChange={(e) =>
                            setRascunho((r) => ({ ...r, [l.classe]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              recalcular();
                            }
                          }}
                          className="h-8 w-28 text-right text-xs tabular-nums"
                        />
                        {l.manual && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            travado
                          </span>
                        )}
                      </div>

                      {l.classe === CLASSE_POS_FIXADO && subsRendaFixa.length > 0 && (
                        <ul className="order-5 col-span-full mt-1 space-y-1 border-t border-border/60 pt-1.5 pl-4 sm:order-none">
                          {subsRendaFixa.map((s) => (
                            <li
                              key={s.nome}
                              className="grid grid-cols-[minmax(0,1fr)_5rem_6.5rem] items-center gap-3 text-xs text-muted-foreground"
                            >
                              <span className="min-w-0 truncate">↳ {s.nome}</span>
                              <span className="num text-right">{pct(s.alvoPct)}</span>
                              <span className="num text-right font-semibold text-foreground">
                                {brl(l.valor * s.fracao, 2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
