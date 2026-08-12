/** Utilitários de formatação de números e moedas no padrão brasileiro. */

/** 
 * Converte texto no padrão brasileiro ("1.234,56") para número (1234.56).
 */
export const numeroBR = (v: string | number): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(
    String(v)
      .trim()
      .replace(/\s|R\$/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : 0;
};

/** 
 * Aceita apenas dígitos, ponto e vírgula (formato monetário brasileiro).
 */
export const monetarioValido = (v: string): boolean =>
  /^\d{1,3}(\.\d{3})*(,\d{1,8})?$|^\d+([.,]\d{1,8})?$/.test(v.trim());

/** 
 * Formata um número para o padrão de moeda brasileiro (R$ 1.234,56).
 * Por padrão usa 2 casas decimais.
 */
export const brl = (v: number | string | null | undefined, casas = 2): string => {
  const n = typeof v === "number" ? v : numeroBR(String(v ?? "0"));
  return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

/** 
 * Formata um número para o padrão de porcentagem brasileiro (12,34%).
 * Por padrão usa 2 casas decimais.
 */
export const pct = (v: number | string | null | undefined, casas = 2): string => {
  const n = typeof v === "number" ? v : numeroBR(String(v ?? "0"));
  const valor = Number.isFinite(n) ? n : 0;
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
};

/** 
 * Formata um número puro para o padrão brasileiro (1.234,56).
 */
export const formatarNumeroBR = (v: string | number, casas = 2): string => {
  const n = typeof v === "number" ? v : numeroBR(v);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

