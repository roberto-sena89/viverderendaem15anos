/**
 * Ranking de ativos do Radar — ordena o universo por indicador escolhido
 * (DY 12m, valorização no dia, percentil histórico, P/VPA ou distância da
 * mínima de 52 semanas) e exibe as posições numeradas.
 */

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtPercent, fmtPreco } from "@/components/cotacoes/formatos";
import { CORES_SINAL, ROTULOS_ZONA } from "@/lib/radar-base";
import type { LinhaRadarBase } from "@/lib/radar.server";

type Critério = "dy" | "variacao" | "percentil" | "pvp" | "minima52";

const CRITERIOS: { valor: Critério; rotulo: string }[] = [
  { valor: "dy", rotulo: "Maior DY 12m" },
  { valor: "variacao", rotulo: "Maior alta no dia" },
  { valor: "percentil", rotulo: "Menor percentil histórico" },
  { valor: "pvp", rotulo: "Menor P/VPA" },
  { valor: "minima52", rotulo: "Mais perto da mín. 52s" },
];

const MEDALHAS = ["text-amber-500", "text-slate-400", "text-orange-400"];

function valorCritério(l: LinhaRadarBase, criterio: Critério): number | null {
  switch (criterio) {
    case "dy":
      return l.dy12;
    case "variacao":
      return l.variacaoDia;
    case "percentil":
      return l.posicao?.percentil ?? null;
    case "pvp":
      return l.pvp;
    case "minima52":
      return l.posicao?.distMinima52sPct ?? null;
  }
}

function formatarValor(v: number | null, criterio: Critério): string {
  if (v === null || !Number.isFinite(v)) return "—";
  switch (criterio) {
    case "dy":
      return `${v.toLocaleString("pt-BR")}%`;
    case "variacao":
      return fmtPercent(v);
    case "percentil":
      return `${v.toFixed(0)}%`;
    case "pvp":
      return v.toLocaleString("pt-BR");
    case "minima52":
      return `−${v.toFixed(1).replace(".", ",")}%`;
  }
}

function corValor(v: number | null, criterio: Critério): string {
  if (v === null || !Number.isFinite(v)) return "text-muted-foreground";
  switch (criterio) {
    case "variacao":
      return v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-muted-foreground";
    case "percentil":
      return v <= 25 ? "text-emerald-600" : v <= 45 ? "text-sky-600" : "text-muted-foreground";
    case "minima52":
      return v <= 5 ? "text-emerald-600" : v <= 20 ? "text-sky-600" : "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

export function RankingRadar({
  linhas,
  aoSelecionar,
}: {
  linhas: (LinhaRadarBase & { sinal: LinhaRadarBase["sinal"] })[];
  aoSelecionar: (linha: LinhaRadarBase) => void;
}) {
  const [criterio, setCriterio] = useState<Critério>("dy");

  const ranking = useMemo(() => {
    const semDados = linhas.filter((l) => valorCritério(l, criterio) === null);
    const comDados = linhas
      .filter((l) => valorCritério(l, criterio) !== null)
      .sort((a, b) => {
        const va = valorCritério(a, criterio) as number;
        const vb = valorCritério(b, criterio) as number;
        switch (criterio) {
          case "dy":
          case "variacao":
            return vb - va;
          case "percentil":
          case "pvp":
          case "minima52":
            return va - vb;
        }
      });
    return [...comDados, ...semDados];
  }, [linhas, criterio]);

  if (!linhas.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nenhum ativo encontrado com esses filtros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Posição do preço na própria história e indicadores do universo filtrado.
        </p>
        <Select value={criterio} onValueChange={(v) => setCriterio(v as Critério)}>
          <SelectTrigger className="w-full min-w-0 sm:w-56">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {CRITERIOS.map((c) => (
              <SelectItem key={c.valor} value={c.valor}>
                {c.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ol className="space-y-1.5">
        {ranking.map((l, i) => {
          const v = valorCritério(l, criterio);
          return (
            <li key={l.ticker}>
              <button
                type="button"
                onClick={() => aoSelecionar(l)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <span
                  className={`w-6 shrink-0 text-center text-sm font-bold tabular-nums ${
                    i < 3 && v !== null ? MEDALHAS[i] : "text-muted-foreground"
                  }`}
                >
                  {i + 1}º
                </span>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {l.logo ? (
                    <img src={l.logo} alt="" loading="lazy" className="size-full object-contain" />
                  ) : (
                    <span className="text-[0.6rem] font-semibold text-muted-foreground">
                      {l.ticker.slice(0, 4)}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{l.ticker}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.nome}
                    {l.setor ? ` · ${l.setor}` : ""}
                  </span>
                </span>

                <span className="hidden shrink-0 flex-col items-end sm:flex">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {fmtPreco(l.preco, "BRL")}
                  </span>
                  <span className={`text-xs tabular-nums ${corValor(l.variacaoDia, "variacao")}`}>
                    {fmtPercent(l.variacaoDia)}
                  </span>
                </span>

                <span className="flex w-24 shrink-0 flex-col items-end">
                  <span className={`text-sm font-bold tabular-nums ${corValor(v, criterio)}`}>
                    {formatarValor(v, criterio)}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">
                    {l.posicao?.percentil !== null && l.posicao?.percentil !== undefined
                      ? ROTULOS_ZONA[l.sinal.zona]
                      : "sem histórico"}
                  </span>
                </span>

                <Badge
                  className={`shrink-0 border-none ${CORES_SINAL[l.sinal.tipo]}`}
                  title={l.sinal.motivo}
                >
                  {l.sinal.tipo === "comprar"
                    ? "Comprar"
                    : l.sinal.tipo === "manter"
                      ? "Manter"
                      : l.sinal.tipo === "vender"
                        ? "Vender"
                        : l.sinal.tipo === "observar"
                          ? "Observar"
                          : "Sem dados"}
                </Badge>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
