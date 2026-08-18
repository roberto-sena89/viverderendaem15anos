import type { ReactNode } from "react";
import { useColunasResponsivas } from "@/hooks/use-colunas-responsivas";
import type { ColunaResponsiva } from "@/lib/colunas-responsivas";
import { cn } from "@/lib/utils";

/**
 * Tabela de dados responsiva com layout de colunas dinâmico.
 *
 * - Colunas com `visivelDe` aparecem/somem conforme o breakpoint atual;
 * - larguras proporcionais por peso (table-fixed, sem scroll horizontal);
 * - cabeçalho e células renderizados via props, permitindo células custom
 *   (sort, tooltips, badges etc.).
 *
 * Use dentro de um wrapper com `hidden md:block` e ofereça o layout em
 * cards para telas menores quando a tabela não couber.
 */
export function TabelaResponsiva<L>({
  linhas,
  colunas,
  chave,
  renderizarCelula,
  renderizarCabecalho,
  colunasMinimas,
  aoClicarLinha,
  ariaLabel,
  className,
}: {
  linhas: readonly L[];
  colunas: readonly ColunaResponsiva[];
  chave: (linha: L, indice: number) => string;
  renderizarCelula: (linha: L, coluna: ColunaResponsiva, indice: number) => ReactNode;
  renderizarCabecalho?: (coluna: ColunaResponsiva) => ReactNode;
  colunasMinimas?: readonly string[];
  aoClicarLinha?: (linha: L) => void;
  ariaLabel: string;
  className?: string;
}) {
  const { visiveis, larguras } = useColunasResponsivas(colunas, colunasMinimas);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full table-fixed border-collapse text-sm" aria-label={ariaLabel}>
          <thead className="bg-muted/40">
            <tr>
              {visiveis.map((c) => {
                const larguraPct = larguras.get(c.id);
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={cn(
                      "t-label px-3 py-2.5",
                      c.alinhamento === "left" ? "text-left" : "text-right",
                      c.classeLargura,
                    )}
                    style={larguraPct ? { width: larguraPct } : undefined}
                  >
                    {renderizarCabecalho ? renderizarCabecalho(c) : c.rotulo}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr
                key={chave(l, i)}
                onClick={aoClicarLinha ? () => aoClicarLinha(l) : undefined}
                className={cn(
                  "border-t border-border/60 transition-colors hover:bg-muted/40",
                  aoClicarLinha && "cursor-pointer",
                )}
              >
                {visiveis.map((c) => (
                  <td
                    key={c.id}
                    className={cn(
                      "px-3 py-2.5",
                      c.alinhamento === "left" ? "text-left" : "text-right",
                    )}
                  >
                    {renderizarCelula(l, c, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
