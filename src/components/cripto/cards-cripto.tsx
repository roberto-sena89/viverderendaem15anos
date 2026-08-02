import { Star } from "lucide-react";
import { RealceTermo } from "@/components/cripto/realce-termo";
import { BadgeCategoria } from "@/components/cripto/badge-categoria";
import { useFlashPrecos, type PosicaoCarteira } from "@/components/cripto/tabela-cripto";
import { corVar, fmtCompacto, fmtPct, fmtPreco } from "@/components/cripto/formatos-cripto";
import { CelulaVariacao, useDirecaoVariacoes } from "@/components/cripto/variacao-cripto";
import { ehStablecoin, type LinhaCripto } from "@/lib/cripto-base";

const CAMPOS_AO_VIVO = ["variacao1h", "variacao24h", "variacao7d"] as const;

/** Layout mobile: cada criptomoeda em um cartão compacto. */
export function CardsCripto({
  linhas,
  usdBrl,
  favoritos,
  aoFavoritar,
  posicoes,
  aoAbrir,
  termoBusca,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  favoritos: string[];
  aoFavoritar: (ticker: string) => void;
  posicoes: Map<string, PosicaoCarteira>;
  aoAbrir: (l: LinhaCripto) => void;
  termoBusca?: string;
}) {
  const flash = useFlashPrecos(linhas);
  const direcao = useDirecaoVariacoes(linhas, CAMPOS_AO_VIVO);

  return (
    <ul className="space-y-2 p-2">
      {linhas.map((l) => {
        const stable = ehStablecoin(l);
        const brl = l.precoUsd === null ? null : l.precoUsd * usdBrl;
        const favorito = favoritos.includes(l.ticker);
        const posicao = posicoes.get(l.ticker);
        const rentabilidade =
          posicao && posicao.precoMedio > 0 && brl !== null ? (brl / posicao.precoMedio - 1) * 100 : null;

        return (
          <li key={l.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => aoAbrir(l)}
              onKeyDown={(e) => {
                if (e.key === "Enter") aoAbrir(l);
              }}
              className={`panel rounded-xl p-3 ${posicao ? "border-l-2 border-l-primary" : ""}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={favorito ? `Remover ${l.ticker} dos favoritos` : `Favoritar ${l.ticker}`}
                    aria-pressed={favorito}
                    onClick={(e) => {
                      e.stopPropagation();
                      aoFavoritar(l.ticker);
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-md"
                  >
                    <Star
                      className={`size-4 transition-all duration-200 ${
                        favorito ? "scale-110 fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                  {l.imagem ? (
                    <img src={l.imagem} alt="" className="size-7 shrink-0 rounded-full" loading="lazy" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium"><RealceTermo texto={l.nome} termo={termoBusca} /></p>
                    <p className="text-xs text-muted-foreground">
                      #{l.rank ?? "—"} · <RealceTermo texto={l.ticker} termo={termoBusca} />
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-base font-semibold tabular-nums ${
                      flash[l.id] === "alta" ? "flash-alta" : flash[l.id] === "baixa" ? "flash-baixa" : ""
                    }`}
                  >
                    {fmtPreco(brl, "R$")}
                  </p>
                  <p className="text-sm font-medium">
                    <CelulaVariacao
                      valor={l.variacao24h}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao24h`]}
                    />
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg bg-muted/20 py-2 text-center">
                <div className="min-w-0 px-1">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Var. 1h</p>
                  <div className="mt-0.5 flex justify-center text-xs font-medium tabular-nums">
                    <CelulaVariacao
                      valor={l.variacao1h}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao1h`]}
                    />
                  </div>
                </div>
                <div className="min-w-0 px-1">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Var. 7D</p>
                  <div className="mt-0.5 flex justify-center text-xs font-medium tabular-nums">
                    <CelulaVariacao
                      valor={l.variacao7d}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao7d`]}
                    />
                  </div>
                </div>
                <div className="min-w-0 px-1">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Var. 30D</p>
                  <p className={`mt-0.5 text-xs font-medium tabular-nums ${corVar(l.variacao30d, stable)}`}>
                    {fmtPct(l.variacao30d)}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Cap.</p>
                  <p className="truncate text-xs tabular-nums">{fmtCompacto(l.capitalizacao)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Vol. 24h</p>
                  <p className="truncate text-xs tabular-nums">{fmtCompacto(l.volume24h)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">USD</p>
                  <p className="truncate text-xs tabular-nums">{fmtPreco(l.precoUsd, "US$")}</p>
                </div>
              </div>


              <div className="mt-2 flex items-center justify-between gap-2">
                <BadgeCategoria categoria={l.categoria} rede={l.rede} />
                {rentabilidade !== null ? (
                  <span className={`text-[0.7rem] tabular-nums ${corVar(rentabilidade)}`}>
                    sua posição {fmtPct(rentabilidade)}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
