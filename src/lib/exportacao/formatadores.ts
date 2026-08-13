/** Utilitários de formatação usados pelos geradores de arquivo. */

/** Arredonda para `casas` decimais devolvendo número (nunca string). */
export const arredondar = (v: number, casas = 2): number => {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};

/** Data no padrão ISO curto (YYYY-MM-DD). */
export const dataIso = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

/** Escapa um campo para CSV RFC 4180 (aspas duplas quando necessário). */
export const campoCsv = (valor: string | number): string => {
  const s = typeof valor === "number" ? String(valor) : valor;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Dispara o download de um Blob no navegador. */
export const baixarArquivo = (blob: Blob, nome: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar no próximo tick evita cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const FORMATO_MOEDA = "R$ #,##0.00;[Red]-R$ #,##0.00";
export const FORMATO_PERCENTUAL = '0.00"%"';
export const FORMATO_QUANTIDADE = "#,##0.########";
