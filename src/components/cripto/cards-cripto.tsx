import { Star } from "lucide-react";
import { BadgeCategoria } from "@/components/cripto/badge-categoria";
import { useFlashPrecos, type PosicaoCarteira } from "@/components/cripto/tabela-cripto";
import { corVar, fmtCompacto, fmtPct, fmtPreco } from "@/components/cripto/formatos-cripto";
import { ehStablecoin, type LinhaCripto } from "@/lib/cripto-base";

/** Layout mobile: cada criptomoeda em um cartão compacto. */
export function CardsCripto({
  linhas,
  usdBrl,
  favoritos,
  aoFavoritar,
  posicoes,
  aoAbrir,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  favoritos: string[];
  aoFavoritar: (ticker: string) => void;
  posicoes: Map<string, PosicaoCarteira>;
  aoAbrir: (l: LinhaCripto) => void;
}) {
  const flash = useFlashPrecos(linhas);

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
                    <p className="truncate text-sm font-medium">{l.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      #{l.rank ?? "—"} · {l.ticker}
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
                  <p className={`text-sm font-medium tabular-nums ${corVar(l.variacao24h, stable)}`}>
                    {fmtPct(l.variacao24h)}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Capitalização</span>
                  <span className="tabular-nums">{fmtCompacto(l.capitalizacao)}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Vol. 24h</span>
                  <span className="tabular-nums">{fmtCompacto(l.volume24h)}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Cotação USD</span>
                  <span className="tabular-nums">{fmtPreco(l.precoUsd, "US$")}</span>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Var. 30D</span>
                  <span className={`tabular-nums ${corVar(l.variacao30d, stable)}`}>
                    {fmtPct(l.variacao30d)}
                  </span>
                </p>
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
