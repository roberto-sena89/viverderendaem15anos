/**
 * Tabela do Radar de Oportunidades — triagem consolidada da B3.
 */

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtPercent, fmtPreco, corVar } from "@/components/cotacoes/formatos";
import { CORES_SINAL, ROTULOS_ZONA, type SinalRadar } from "@/lib/radar-base";
import type { LinhaRadarBase } from "@/lib/radar.server";
import type { NoticiaResumo } from "@/lib/radar.functions";
import { Newspaper } from "lucide-react";

const ROTULOS_SINAL: Record<SinalRadar["tipo"], string> = {
  comprar: "Comprar",
  manter: "Manter",
  vender: "Vender",
  observar: "Observar",
  "sem-dados": "Sem dados",
};

function SinalBadge({ sinal }: { sinal: SinalRadar }) {
  return (
    <Badge
      className={`whitespace-nowrap border-none ${CORES_SINAL[sinal.tipo]}`}
      title={sinal.motivo}
    >
      {ROTULOS_SINAL[sinal.tipo]}
      {sinal.urgente ? " ⚠" : ""}
    </Badge>
  );
}

function BarraPercentil({ percentil }: { percentil: number | null }) {
  if (percentil === null) return <span className="text-xs text-muted-foreground">—</span>;
  const cor =
    percentil <= 25
      ? "bg-emerald-500"
      : percentil <= 45
        ? "bg-sky-500"
        : percentil <= 70
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="flex w-16 shrink-0 flex-col gap-1 sm:w-24">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${percentil}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{percentil.toFixed(0)}%</span>
    </div>
  );
}


/** Distância até a mínima de 52 semanas: 0% = na mínima (oportunidade). */
function Distancia52s({ pct }: { pct: number | null }) {
  if (pct === null)
    return <span className="block text-center text-xs text-muted-foreground">—</span>;
  const cor = pct <= 5 ? "text-emerald-600" : pct <= 20 ? "text-sky-600" : "text-muted-foreground";
  return (
    <span className={`block text-center text-xs tabular-nums ${cor}`}>
      −{pct.toFixed(1).replace(".", ",")}%
    </span>
  );
}


/** Noticiário recente do ativo: chip com contagem e título das últimas manchetes. */
function NoticiasChip({ noticias }: { noticias: NoticiaResumo[] }) {
  if (!noticias.length) return <span className="text-xs text-muted-foreground">—</span>;
  const urgentes = noticias.filter((n) => n.urgente).length;
  return (
    <span
      title={noticias.map((n) => n.titulo).join("\n")}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        urgentes ? "bg-red-600/10 text-red-600" : "bg-muted/60 text-muted-foreground"
      }`}
    >
      <Newspaper className="size-3" aria-hidden />
      {noticias.length}
      {urgentes ? <span className="font-bold">· {urgentes} urgente</span> : null}
    </span>
  );
}

export function TabelaRadar({
  linhas,
  noticiasPorTicker,
  carregandoPosicoes,
  aoSelecionar,
}: {
  linhas: (LinhaRadarBase & { sinal: SinalRadar })[];
  noticiasPorTicker: Record<string, NoticiaResumo[]>;
  carregandoPosicoes: boolean;
  aoSelecionar: (linha: LinhaRadarBase) => void;
}) {
  if (!linhas.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nenhum ativo encontrado com esses filtros.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border bg-card">
      <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-[720px] table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[26%] min-w-[150px] pl-4">Ativo</TableHead>
            <TableHead className="hidden w-[14%] lg:table-cell">Setor / Tipo</TableHead>
            <TableHead className="w-[10%] whitespace-nowrap text-right">Preço</TableHead>
            <TableHead className="w-[9%] whitespace-nowrap text-right">Variação</TableHead>
            <TableHead className="w-[8%] whitespace-nowrap text-right">DY 12m</TableHead>
            <TableHead className="w-[8%] whitespace-nowrap text-right">P/VPA</TableHead>
            <TableHead className="w-[14%]">Histórico</TableHead>
            <TableHead className="hidden w-[8%] whitespace-nowrap xl:table-cell">Mín. 52s</TableHead>
            <TableHead className="hidden w-[8%] lg:table-cell">Notícias</TableHead>
            <TableHead className="w-[10%] pr-4">Sinal</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.ticker} onClick={() => aoSelecionar(l)} className="cursor-pointer">
              <TableCell className="pl-4">
                <div className="flex items-center gap-3">
                  {l.logo ? (
                    <img
                      src={l.logo}
                      alt=""
                      loading="lazy"
                      className="size-7 shrink-0 rounded object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.nome}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="block truncate text-xs text-muted-foreground">{l.setor ?? "—"}</span>
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {l.preco !== null ? fmtPreco(l.preco, "BRL") : "—"}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${corVar(l.variacaoDia)}`}>
                {fmtPercent(l.variacaoDia)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-positive">
                {l.dy12 !== null ? `${l.dy12.toLocaleString("pt-BR")}%` : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {l.pvp !== null ? l.pvp.toLocaleString("pt-BR") : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <BarraPercentil percentil={l.posicao?.percentil ?? null} />
                  {l.posicao ? (
                    <span className="hidden text-xs text-muted-foreground xl:inline">
                      {ROTULOS_ZONA[l.sinal.zona]}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <Distancia52s pct={l.posicao?.distMinima52sPct ?? null} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <NoticiasChip noticias={noticiasPorTicker[l.ticker] ?? []} />
              </TableCell>
              <TableCell className="pr-4">
                <SinalBadge sinal={l.sinal} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {carregandoPosicoes && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Buscando histórico dos ativos visíveis…
        </p>
      )}
    </div>

  );
}
