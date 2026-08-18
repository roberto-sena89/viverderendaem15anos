export const SITE_URL = "https://viverderendaem15anos.lovable.app";

export function urlAbsoluta(caminho: string): string {
  const separado = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return `${SITE_URL}${separado}`;
}
