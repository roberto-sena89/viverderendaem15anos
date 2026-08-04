import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeCategoria } from "@/components/cripto/badge-categoria";
import {
  corVar,
  fmtCompacto,
  fmtPct,
  fmtPreco,
  fmtQuantidade,
} from "@/components/cripto/formatos-cripto";
import { ehStablecoin, EXPLICACAO_CATEGORIA, type LinhaCripto } from "@/lib/cripto-base";
import { historicoMoeda } from "@/lib/cripto.functions";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";

const PERIODOS = [
  { id: "1", rotulo: "24h" },
  { id: "7", rotulo: "7D" },
  { id: "30", rotulo: "30D" },
  { id: "90", rotulo: "90D" },
  { id: "365", rotulo: "12M" },
  { id: "max", rotulo: "Máx." },
];

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-bloco">
      <p className="t-label">{rotulo}</p>
      <p className={`t-num mt-0.5 font-semibold ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

/** Detalhes da criptomoeda: gráfico histórico, indicadores e posição do usuário. */
export function ModalCripto({
  linha,
  usdBrl,
  aberto,
  aoFechar,
}: {
  linha: LinhaCripto | null;
  usdBrl: number;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [periodo, setPeriodo] = useState("30");
  const buscarHistorico = useServerFn(historicoMoeda);
  const { ehFavorito, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  const { data: serie = [], isLoading } = useQuery({
    queryKey: ["cripto-historico", linha?.id, periodo],
    queryFn: () => buscarHistorico({ data: { id: linha?.id ?? "", dias: periodo } }),
    enabled: aberto && Boolean(linha?.id),
    staleTime: 5 * 60_000,
  });

  const dados = useMemo(
    () => serie.map((p) => ({ t: p.t, preco: p.preco, brl: p.preco * usdBrl })),
    [serie, usdBrl],
  );

  if (!linha) return null;

  const stable = ehStablecoin(linha);
  const brl = linha.precoUsd === null ? null : linha.precoUsd * usdBrl;
  const posicao = ativos.find((a) => a.ticker.toUpperCase() === linha.ticker.toUpperCase());
  const rentabilidade =
    posicao && posicao.precoMedio > 0 && brl !== null ? (brl / posicao.precoMedio - 1) * 100 : null;
  const favorito = ehFavorito(linha.ticker);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
            {linha.imagem ? <img src={linha.imagem} alt="" className="size-6 rounded-full" /> : null}
            <span className="font-display text-xl">{linha.nome}</span>
            <span className="text-sm text-muted-foreground">{linha.ticker}</span>
            <BadgeCategoria categoria={linha.categoria} rede={linha.rede} />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-pressed={favorito}
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={() => alternar(linha.ticker)}
            >
              <Star className={`size-4 ${favorito ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-left">
            {EXPLICACAO_CATEGORIA[linha.categoria]}
          </DialogDescription>
        </DialogHeader>

        <div className="pilha-secao">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-display text-3xl tabular-nums">{fmtPreco(brl, "R$")}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{fmtPreco(linha.precoUsd, "US$")}</p>
            <p className={`text-sm font-semibold tabular-nums ${corVar(linha.variacao24h, stable)}`}>
              {fmtPct(linha.variacao24h)} em 24h
            </p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={periodo === p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    periodo === p.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
            <div className="h-56 w-full">
              {isLoading || dados.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  {isLoading ? "Carregando histórico…" : "Histórico indisponível no momento."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="grad-cripto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="t"
                      tickFormatter={(t: number) =>
                        new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      }
                      tick={{ fontSize: 11 }}
                      minTickGap={28}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      width={64}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => fmtPreco(v, "US$")}
                      stroke="var(--color-muted-foreground)"
                    />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(t) => new Date(Number(t)).toLocaleString("pt-BR")}
                      formatter={(v: number) => [fmtPreco(v, "US$"), "Cotação"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="preco"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#grad-cripto)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-bloco sm:grid-cols-4">
            <Item rotulo="Capitalização" valor={fmtCompacto(linha.capitalizacao)} />
            <Item rotulo="Volume 24h" valor={fmtCompacto(linha.volume24h)} />
            <Item rotulo="Máxima 24h" valor={fmtPreco(linha.maximo24h, "US$")} />
            <Item rotulo="Mínima 24h" valor={fmtPreco(linha.minimo24h, "US$")} />
            <Item rotulo="Fornecimento" valor={fmtQuantidade(linha.fornecimento)} />
            <Item rotulo="Var. 7 dias" valor={fmtPct(linha.variacao7d)} cor={corVar(linha.variacao7d, stable)} />
            <Item rotulo="Var. 30 dias" valor={fmtPct(linha.variacao30d)} cor={corVar(linha.variacao30d, stable)} />
            <Item rotulo="Var. 12 meses" valor={fmtPct(linha.variacao12m)} cor={corVar(linha.variacao12m, stable)} />
          </div>

          {posicao ? (
            <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-bloco">
              <p className="t-card-title">Sua posição</p>
              <div className="mt-bloco grid grid-cols-2 gap-bloco sm:grid-cols-4">
                <Item rotulo="Quantidade" valor={posicao.quantidade.toLocaleString("pt-BR")} />
                <Item rotulo="Preço médio" valor={fmtPreco(posicao.precoMedio, "R$")} />
                <Item
                  rotulo="Saldo atual"
                  valor={fmtPreco(brl === null ? null : brl * posicao.quantidade, "R$")}
                />
                <Item
                  rotulo="Rentabilidade"
                  valor={fmtPct(rentabilidade)}
                  cor={corVar(rentabilidade)}
                />
              </div>
            </div>
          ) : null}

          <p className="t-caption">
            Criptomoedas são ativos de altíssima volatilidade e negociam 24 horas por dia, inclusive
            fins de semana. Os dados são informativos e não constituem recomendação de investimento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
