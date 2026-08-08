import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/panel";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { GradeCotacoes } from "@/components/cotacoes/grade-cotacoes";
import { corVar, fmtPercent, fmtPreco, fmtVolume } from "@/components/cotacoes/formatos";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import {
  gradeMercado,
  type CategoriaMercado,
  type LinhaCotacao,
} from "@/lib/grade-mercado.functions";
import { TextoTruncado } from "@/components/texto-truncado";

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="panel p-cartao">
      <p className="t-label">{titulo}</p>
      <div className="mt-bloco">{children}</div>
    </div>
  );
}

function Destaque({
  linha,
  valor,
  icone,
}: {
  linha: LinhaCotacao | null;
  valor: string;
  icone: React.ReactNode;
}) {
  if (!linha) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <TextoTruncado as="p" className="t-ticker font-display" texto={linha.ticker}>
          {linha.ticker}
        </TextoTruncado>
        <TextoTruncado as="p" className="t-subtexto" texto={fmtPreco(linha.preco, linha.moeda)}>
          {fmtPreco(linha.preco, linha.moeda)}
        </TextoTruncado>
      </div>
      <span className="t-num inline-flex shrink-0 items-center gap-1 font-semibold">
        {icone}
        {valor}
      </span>
    </div>
  );
}

/**
 * Aplica o mesmo layout da aba "Ações" às demais categorias de cotações:
 * faixa de cards de destaque no topo + painel único com cabeçalho, dica e grade.
 */
export function PainelCategoria({
  categoria,
  titulo,
  intervaloMs,
  busca,
  aoAtualizar,
}: {
  categoria: CategoriaMercado;
  titulo: string;
  intervaloMs: number;
  busca: string;
  aoAtualizar?: (quando: number, parcial: boolean) => void;
}) {
  const buscarGrade = useServerFn(gradeMercado);
  const queryClient = useQueryClient();
  const pregao = estadoPregao();

  const { data, isFetching } = useQuery({
    queryKey: ["grade-mercado", categoria],
    queryFn: () => buscarGrade({ data: { categoria } }),
    refetchInterval: intervaloMs > 0 ? intervaloMs : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    gcTime: 30 * 60_000,
  });

  const { maiorAlta, maiorBaixa, maiorVolume, media } = useMemo(() => {
    const linhas = (data?.linhas ?? []).filter((l) => l.preco !== null);
    const comDia = linhas.filter((l) => l.variacaoPercent !== null);
    return {
      maiorAlta: comDia.reduce<LinhaCotacao | null>(
        (m, l) => (!m || (l.variacaoPercent ?? 0) > (m.variacaoPercent ?? 0) ? l : m),
        null,
      ),
      maiorBaixa: comDia.reduce<LinhaCotacao | null>(
        (m, l) => (!m || (l.variacaoPercent ?? 0) < (m.variacaoPercent ?? 0) ? l : m),
        null,
      ),
      maiorVolume: linhas.reduce<LinhaCotacao | null>(
        (m, l) => (!m || (l.volume ?? 0) > (m.volume ?? 0) ? l : m),
        null,
      ),
      media: comDia.length
        ? comDia.reduce((s, l) => s + (l.variacaoPercent ?? 0), 0) / comDia.length
        : null,
    };
  }, [data]);

  const altas = (data?.linhas ?? []).filter((l) => (l.variacaoPercent ?? 0) > 0).length;
  const baixas = (data?.linhas ?? []).filter((l) => (l.variacaoPercent ?? 0) < 0).length;

  return (
    <div className="pilha-secao">
      <div className="grid gap-secao sm:grid-cols-2 xl:grid-cols-4">
        <Card titulo={`Panorama · ${titulo}`}>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={`t-metric-sm ${corVar(media)}`}>{fmtPercent(media)}</p>
              <p className="t-num-sm mt-1 text-muted-foreground">
                <span className="text-positive">{altas} em alta</span> ·{" "}
                <span className="text-negative">{baixas} em baixa</span>
              </p>
            </div>
            <Sparkline
              serie={maiorVolume?.spark ?? []}
              positivo={(media ?? 0) >= 0}
              largura={92}
              altura={32}
            />
          </div>
        </Card>

        <Card titulo="Maior alta do dia">
          <Destaque
            linha={maiorAlta}
            valor={fmtPercent(maiorAlta?.variacaoPercent ?? null)}
            icone={<ArrowUpRight className="size-4 text-positive" />}
          />
        </Card>

        <Card titulo="Maior baixa do dia">
          <Destaque
            linha={maiorBaixa}
            valor={fmtPercent(maiorBaixa?.variacaoPercent ?? null)}
            icone={<ArrowDownRight className="size-4 text-negative" />}
          />
        </Card>

        <Card titulo="Maior volume">
          <Destaque
            linha={maiorVolume}
            valor={fmtVolume(maiorVolume?.volume ?? null)}
            icone={<BarChart3 className="size-4 text-primary" />}
          />
        </Card>
      </div>

      <Panel
        title={titulo}
        hint={
          data
            ? `${(data.linhas?.length ?? 0).toLocaleString("pt-BR")} ativos monitorados · preços ${
                pregao.aberto ? "ao vivo durante o pregão" : "do último fechamento"
              }${data.parcial ? " · alguns dados indisponíveis no momento" : ""}`
            : "Carregando cotações…"
        }
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                intervaloMs > 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  intervaloMs > 0 ? "animate-pulse bg-primary" : "bg-muted-foreground"
                }`}
                aria-hidden
              />
              {intervaloMs > 0 ? `Atualiza ${Math.round(intervaloMs / 1000)}s` : "Manual"}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["grade-mercado", categoria] })
              }
              aria-label={`Atualizar cotações de ${titulo}`}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        }
      >
        <GradeCotacoes
          categoria={categoria}
          intervaloMs={intervaloMs}
          busca={busca}
          aoAtualizar={aoAtualizar}
          ocultarAtualizar
        />
      </Panel>
    </div>
  );
}
