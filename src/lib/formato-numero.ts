/** Utilitários de número no padrão brasileiro (19.463,53). */

/** Converte texto no padrão brasileiro para número. */
export const numeroBR = (v: string): number => {
  const n = Number(String(v).trim().replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Aceita apenas dígitos, ponto e vírgula (formato monetário brasileiro). */
export const monetarioValido = (v: string): boolean =>
  /^\d{1,3}(\.\d{3})*(,\d{1,8})?$|^\d+([.,]\d{1,8})?$/.test(v.trim());

/** Formata para o padrão brasileiro com 2 casas (1.234,56). */
export const formatarNumeroBR = (v: string | number, casas = 2): string => {
  if (typeof v === "number") {
    return (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
  }
  if (!v.trim()) return "";
  if (!monetarioValido(v)) return v;
  return numeroBR(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
};
