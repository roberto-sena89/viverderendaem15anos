import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtPreco } from "@/components/cripto/formatos-cripto";
import { TextoTruncado } from "@/components/texto-truncado";
import type { LinhaCripto } from "@/lib/cripto-base";

/** Conversor rápido entre uma criptomoeda e BRL/USD. */
export function ConversorCripto({ linhas, usdBrl }: { linhas: LinhaCripto[]; usdBrl: number }) {
  const [moedaId, setMoedaId] = useState("bitcoin");
  const [quantidade, setQuantidade] = useState("1");
  const [invertido, setInvertido] = useState(false);

  const opcoes = linhas.slice(0, 60);
  const moeda = linhas.find((l) => l.id === moedaId) ?? opcoes[0] ?? null;
  const qtd = Number(quantidade.replace(",", ".")) || 0;
  const precoBrl = moeda?.precoUsd === null || !moeda ? null : moeda.precoUsd * usdBrl;

  const resultado = (() => {
    if (precoBrl === null || moeda?.precoUsd == null) return null;
    return invertido
      ? { valor: qtd / precoBrl, simbolo: moeda.ticker }
      : { valor: qtd * precoBrl, simbolo: "R$" };
  })();

  return (
    <div className="panel rounded-xl p-cartao">
      <p className="t-card-title">Conversor</p>
      <div className="mt-bloco grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[140px_auto_1fr_auto]">
        <Input
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          inputMode="decimal"
          aria-label="Quantidade a converter"
          className="h-9 text-sm"
        />
        {invertido ? (
          <span className="text-sm text-muted-foreground">R$</span>
        ) : (
          <Select value={moeda?.id ?? ""} onValueChange={setMoedaId}>
            <SelectTrigger className="h-9 text-sm" aria-label="Criptomoeda">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.ticker} · {l.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          type="button"
          onClick={() => setInvertido((v) => !v)}
          aria-label="Inverter conversão"
          className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <p className="t-num col-span-2 text-right font-semibold sm:col-span-1">
          {resultado === null
            ? "—"
            : invertido
              ? `${resultado.valor.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} ${resultado.simbolo}`
              : fmtPreco(resultado.valor, "R$")}
        </p>
      </div>
      <p className="t-caption mt-1.5">
        {moeda
          ? `1 ${moeda.ticker} = ${fmtPreco(precoBrl, "R$")} · dólar R$ ${usdBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : ""}
      </p>
    </div>
  );
}

/** Comparação lado a lado das moedas selecionadas na grade. */
export function ComparadorCripto({
  linhas,
  usdBrl,
  aoRemover,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  aoRemover: (id: string) => void;
}) {
  if (linhas.length === 0) return null;
  const campos: { rotulo: string; valor: (l: LinhaCripto) => string }[] = [
    {
      rotulo: "Cotação (R$)",
      valor: (l) => fmtPreco(l.precoUsd === null ? null : l.precoUsd * usdBrl, "R$"),
    },
    { rotulo: "Cotação (US$)", valor: (l) => fmtPreco(l.precoUsd, "US$") },
    {
      rotulo: "Var. 24h",
      valor: (l) => (l.variacao24h === null ? "—" : `${l.variacao24h.toFixed(2)}%`),
    },
    {
      rotulo: "Var. 30D",
      valor: (l) => (l.variacao30d === null ? "—" : `${l.variacao30d.toFixed(2)}%`),
    },
    {
      rotulo: "Var. 12M",
      valor: (l) => (l.variacao12m === null ? "—" : `${l.variacao12m.toFixed(2)}%`),
    },
  ];

  return (
    <div className="panel rounded-xl p-cartao">
      <p className="t-card-title">Comparação ({linhas.length})</p>
      <div className="mt-bloco overflow-x-auto">
        <div className="flex gap-bloco">
          {linhas.map((l) => (
            <div
              key={l.id}
              className="min-w-[168px] rounded-lg border border-border bg-muted/30 p-bloco"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <TextoTruncado as="span" className="t-ticker min-w-0" texto={l.ticker}>
                  {l.ticker}
                </TextoTruncado>
                <button
                  type="button"
                  onClick={() => aoRemover(l.id)}
                  aria-label={`Remover ${l.ticker} da comparação`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <dl className="mt-1.5 space-y-1">
                {campos.map((c) => (
                  <div key={c.rotulo} className="flex justify-between gap-2">
                    <dt className="t-caption">{c.rotulo}</dt>
                    <dd className="t-num-sm">{c.valor(l)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
