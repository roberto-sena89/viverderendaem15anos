import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { corClasse } from "@/lib/cores-ativos";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { brl, classeDoAtivo, pct, valorAtual } from "@/lib/portfolio";
import type { Ativo } from "@/lib/portfolio";

const ATALHOS = [500, 1000, 2000, 5000];
const MIN_APORTE = 1;
const MAX_APORTE = 10_000_000;

const FORMATO_MOEDA = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/;

/** Valida o texto digitado e devolve o valor numérico ou uma mensagem de erro. */
function validarAporte(entrada: string): { valor: number; erro: string | null } {
  const texto = entrada.trim();
  if (!texto) return { valor: 0, erro: null };
  if (!/^[\d.,\s]+$/.test(texto)) return { valor: 0, erro: "Use apenas números, ponto e vírgula (ex.: 1.500,00)." };
  if (!FORMATO_MOEDA.test(texto.replace(/\s/g, "")))
    return { valor: 0, erro: "Formato inválido. Use o padrão de moeda, ex.: 1.500,00." };

  const normalizado = texto.replace(/\s/g, "").includes(",")
    ? texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    : texto.replace(/\s/g, "");
  const valor = Number(normalizado);

  if (!Number.isFinite(valor)) return { valor: 0, erro: "Valor inválido." };
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
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("1000");
  const [tocado, setTocado] = useState(false);

  const { valor: aporte, erro } = validarAporte(texto);
  const mostrarErro = tocado && Boolean(erro);


  const { linhas, totalAtual, totalFuturo } = useMemo(() => {
    const atualPorClasse: Record<string, number> = {};
    for (const classe of Object.keys(alvo)) atualPorClasse[classe] = 0;
    for (const a of carteira) atualPorClasse[classeDoAtivo(a)] = (atualPorClasse[classeDoAtivo(a)] ?? 0) + valorAtual(a);

    const total = Object.values(atualPorClasse).reduce((s, v) => s + v, 0);
    const futuro = total + aporte;

    const base = Object.entries(alvo).map(([classe, alvoPct]) => {
      const atual = atualPorClasse[classe] ?? 0;
      return { classe, alvoPct, atual, deficit: Math.max((futuro * alvoPct) / 100 - atual, 0) };
    });

    const somaDeficit = base.reduce((s, b) => s + b.deficit, 0);
    const somaAlvo = base.reduce((s, b) => s + b.alvoPct, 0) || 100;

    const resultado = base.map((b) => {
      let valor = 0;
      if (aporte > 0) {
        if (somaDeficit <= 0) {
          valor = (aporte * b.alvoPct) / somaAlvo; // já equilibrada: segue o alvo
        } else if (aporte <= somaDeficit) {
          valor = (aporte * b.deficit) / somaDeficit; // cobre os gaps proporcionalmente
        } else {
          valor = b.deficit + ((aporte - somaDeficit) * b.alvoPct) / somaAlvo; // zera gaps e distribui o resto
        }
      }
      const depois = b.atual + valor;
      return {
        classe: b.classe,
        alvoPct: b.alvoPct,
        atualPct: total > 0 ? (b.atual / total) * 100 : 0,
        valor,
        parte: aporte > 0 ? (valor / aporte) * 100 : 0,
        depoisPct: futuro > 0 ? (depois / futuro) * 100 : 0,
      };
    });

    return {
      linhas: resultado.sort((a, b) => b.valor - a.valor),
      totalAtual: total,
      totalFuturo: futuro,
    };
  }, [carteira, alvo, aporte]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2 px-4 text-xs font-semibold">
          <Calculator className="size-4!" />
          Calcular aporte mensal
        </Button>

      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Calculadora de aporte mensal</DialogTitle>
          <DialogDescription>
            Informe quanto pretende investir no próximo mês e veja o valor exato para cada classe, priorizando o que
            está abaixo da alocação ideal.
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
                {mostrarErro ? erro : `Entre ${brl(MIN_APORTE)} e ${brl(MAX_APORTE)} · use vírgula para centavos.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ATALHOS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setTocado(false);
                    setTexto(String(v));
                  }}
                >
                  {brl(v)}
                </Button>
              ))}
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

          {aporte <= 0 ? (
            <p className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {erro ? "Corrija o valor informado para ver a distribuição." : "Informe um valor para ver a distribuição."}
            </p>
          ) : (
            <div className="min-w-0 space-y-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_5rem_6.5rem_5rem] gap-3 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
                <span>Classe</span>
                <span className="text-right">Alvo / Atual</span>
                <span className="text-right">Aportar</span>
                <span className="text-right">Depois</span>
              </div>

              <ul className="space-y-1.5">
                {linhas
                  .filter((l) => l.valor > 0 || l.alvoPct > 0)
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
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">({pct(l.parte)})</span>
                      </span>
                      <span className="num order-4 text-right text-xs text-muted-foreground sm:order-none">
                        {pct(l.depoisPct)}
                      </span>
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
