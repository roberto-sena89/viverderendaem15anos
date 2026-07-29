import { useState, type FormEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, TrendingDown, TrendingUp } from "lucide-react";
import { DialogDetalheAtivo } from "@/components/dialog-detalhe-ativo";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cotacaoAtivo, fitaMercado } from "@/lib/market.functions";

function preco(valor: number | null, moeda = "BRL") {
  if (valor === null) return "—";
  const prefixo = moeda === "BRL" ? "R$ " : `${moeda} `;
  return `${prefixo}${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function variacao(v: number | null) {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
}

function LinhaCotacao({
  nome,
  descricao,
  valor,
  moeda,
  variacaoPercent,
  onClick,
}: {
  nome: string;
  descricao?: string | null;
  valor: number | null;
  moeda: string;
  variacaoPercent: number | null;
  onClick: () => void;
}) {
  const positivo = (variacaoPercent ?? 0) >= 0;
  const Icone = positivo ? TrendingUp : TrendingDown;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ver detalhes de ${nome}`}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{nome}</span>
          {descricao ? (
            <span className="block truncate text-[0.7rem] text-muted-foreground">{descricao}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="num block text-sm font-semibold">{preco(valor, moeda)}</span>
          <span
            className={`flex items-center justify-end gap-1 text-[0.7rem] font-medium ${
              positivo ? "text-success" : "text-destructive"
            }`}
          >
            <Icone className="size-3" />
            {variacao(variacaoPercent)}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Widget compacto de cotações com busca por ativo. */
export function WidgetCotacoes() {
  const fitaFn = useServerFn(fitaMercado);
  const cotacaoFn = useServerFn(cotacaoAtivo);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");

  const { data: fita, isLoading } = useQuery({
    queryKey: ["fita-mercado"],
    queryFn: () => fitaFn({}),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const {
    data: resultado,
    isFetching: buscando,
    isError: erroBusca,
  } = useQuery({
    queryKey: ["cotacao-busca", busca],
    queryFn: () => cotacaoFn({ data: { simbolo: busca } }),
    enabled: busca.length > 0,
    staleTime: 60 * 1000,
    retry: false,
  });

  const itens = (fita?.itens ?? []).slice(0, 8);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const termo = texto.trim().toUpperCase();
    if (termo) setBusca(termo);
  }

  return (
    <Panel title="Cotações de mercado">
      <form onSubmit={enviar} className="mb-3 flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar ativo (ex.: PETR4, BOVA11, MXRF11)"
          aria-label="Buscar cotação de ativo"
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" className="h-9 shrink-0" aria-label="Buscar">
          {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </form>

      {busca ? (
        erroBusca ? (
          <p className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Não encontramos “{busca}”. Confira o código do ativo.
          </p>
        ) : resultado ? (
          <ul className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-1">
            <LinhaCotacao
              nome={resultado.simbolo}
              descricao={resultado.nome}
              valor={resultado.preco}
              moeda={resultado.moeda}
              variacaoPercent={resultado.variacaoDiaPercent}
              onClick={() => setDetalhe({ simbolo: resultado.simbolo, rotulo: resultado.simbolo })}
            />
          </ul>
        ) : null
      ) : null}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando cotações…</p>
      ) : itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Cotações indisponíveis agora.</p>
      ) : (
        <ul className="grid gap-0.5 sm:grid-cols-2">
          {itens.map((i) => (
            <LinhaCotacao
              key={i.simbolo}
              nome={i.nome}
              valor={i.preco}
              moeda={i.moeda}
              variacaoPercent={i.variacaoPercent}
              onClick={() => setDetalhe({ simbolo: i.simbolo, rotulo: i.nome })}
            />
          ))}
        </ul>
      )}

      {detalhe ? (
        <DialogDetalheAtivo
          simbolo={detalhe.simbolo}
          rotulo={detalhe.rotulo}
          aberto
          onOpenChange={(v) => {
            if (!v) setDetalhe(null);
          }}
        />
      ) : null}
    </Panel>
  );
}
