import { Star } from "lucide-react";
import { RealceTermo } from "@/components/cripto/realce-termo";
import { TextoTruncado } from "@/components/texto-truncado";
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
    <ul className="pilha-bloco p-bloco">
      {linhas.map((l) => {
        const stable = ehStablecoin(l);
        const brl = l.precoUsd === null ? null : l.precoUsd * usdBrl;
        const favorito = favoritos.includes(l.ticker);
        const posicao = posicoes.get(l.ticker);
        const rentabilidade =
          posicao && posicao.precoMedio > 0 && brl !== null
            ? (brl / posicao.precoMedio - 1) * 100
            : null;

        return (
          <li key={l.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => aoAbrir(l)}
              onKeyDown={(e) => {
                if (e.key === "Enter") aoAbrir(l);
              }}
              className={`panel rounded-xl p-cartao ${posicao ? "border-l-2 border-l-primary" : ""}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={
                      favorito ? `Remover ${l.ticker} dos favoritos` : `Favoritar ${l.ticker}`
                    }
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
                    <img
                      src={l.imagem}
                      alt=""
                      className="size-7 shrink-0 rounded-full"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <TextoTruncado as="p" className="t-ticker block" texto={l.nome}>
                      <RealceTermo texto={l.nome} termo={termoBusca} />
                    </TextoTruncado>
                    <TextoTruncado
                      as="p"
                      className="t-subtexto block"
                      texto={`#${l.rank ?? "—"} · ${l.ticker}`}
                    >
                      #{l.rank ?? "—"} · <RealceTermo texto={l.ticker} termo={termoBusca} />
                    </TextoTruncado>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`t-num font-semibold ${
                      flash[l.id] === "alta"
                        ? "flash-alta"
                        : flash[l.id] === "baixa"
                          ? "flash-baixa"
                          : ""
                    }`}
                  >
                    {fmtPreco(brl, "R$")}
                  </p>
                  <p className="t-num-sm font-medium">
                    <CelulaVariacao
                      valor={l.variacao24h}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao24h`]}
                    />
                  </p>
                </div>
              </div>

              <div className="mt-bloco grid grid-cols-3 divide-x divide-border/60 rounded-lg bg-muted/20 py-2 text-center">
                <div className="min-w-0 px-1">
                  <p className="t-label">Var. 1h</p>
                  <div className="mt-0.5 flex justify-center text-xs font-medium tabular-nums">
                    <CelulaVariacao
                      valor={l.variacao1h}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao1h`]}
                    />
                  </div>
                </div>
                <div className="min-w-0 px-1">
                  <p className="t-label">Var. 7D</p>
                  <div className="mt-0.5 flex justify-center text-xs font-medium tabular-nums">
                    <CelulaVariacao
                      valor={l.variacao7d}
                      stable={stable}
                      movimento={direcao[`${l.id}:variacao7d`]}
                    />
                  </div>
                </div>
                <div className="min-w-0 px-1">
                  <p className="t-label">Var. 30D</p>
                  <p className={`t-num-sm mt-0.5 font-medium ${corVar(l.variacao30d, stable)}`}>
                    {fmtPct(l.variacao30d)}
                  </p>
                </div>
              </div>

              <div className="mt-bloco grid grid-cols-3 gap-bloco text-center">
                <div className="min-w-0">
                  <p className="t-label">Cap.</p>
                  <p className="t-num-sm truncate">{fmtCompacto(l.capitalizacao)}</p>
                </div>
                <div className="min-w-0">
                  <p className="t-label">Vol. 24h</p>
                  <p className="t-num-sm truncate">{fmtCompacto(l.volume24h)}</p>
                </div>
                <div className="min-w-0">
                  <p className="t-label">USD</p>
                  <p className="t-num-sm truncate">{fmtPreco(l.precoUsd, "US$")}</p>
                </div>
              </div>

              <div className="mt-bloco flex items-center justify-between gap-2">
                <BadgeCategoria categoria={l.categoria} rede={l.rede} />
                {rentabilidade !== null ? (
                  <span className={`t-caption ${corVar(rentabilidade)}`}>
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
