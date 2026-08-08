import type { LinhaAcao } from "@/lib/acoes-base";

export {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtNumero,
  fmtPct,
  fmtPctSimples,
} from "@/components/fiis/formatos-fii";

/** Nome curto e legível a partir da razão social da empresa. */
export function nomeEmpresa(l: LinhaAcao) {
  const bruto = l.nome
    .replace(/\s*\b(S\.?A\.?|SA|ON|PN|NM|LTDA|HOLDING|PARTICIPACOES|PARTICIPAÇÕES)\b\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const texto = bruto || l.nome;
  if (texto.toUpperCase() === texto) {
    return texto
      .toLowerCase()
      .replace(/(^|\s|\/)([a-zà-ú])/g, (_, a: string, b: string) => a + b.toUpperCase())
      .slice(0, 42);
  }
  return texto.slice(0, 42);
}
