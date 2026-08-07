/**
 * Analytics mínimos (Google Analytics 4), opcionais e à prova de falhas.
 *
 * - Só faz qualquer coisa quando `VITE_GA_MEASUREMENT_ID` existe no build;
 * - injeta o gtag sob demanda (primeiro evento) para não pesar no LCP;
 * - todos os acessos são defensivos: nada lança erro se o GA4 falhar.
 */

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "";

let gtagCarregado = false;

function injetarGtag() {
  if (gtagCarregado || !GA_ID) return;
  gtagCarregado = true;

  const win = window as unknown as Record<string, unknown>;
  const dataLayer: unknown[] = [];
  const gtag = (...args: unknown[]) => {
    (dataLayer as unknown[]).push(args);
  };
  win.dataLayer = dataLayer;
  win.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Inicia a medição (page_view) no primeiro paint — chamar num useEffect. */
export function iniciarAnalytics() {
  if (typeof window === "undefined" || !GA_ID) return;
  injetarGtag();
}

/** Dispara um evento de conversão (ex.: newsletter_inscrito, sign_up). */
export function trackEvent(evento: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !GA_ID) return;
  injetarGtag();
  const gtag = (window as unknown as Record<string, unknown>).gtag;
  if (typeof gtag === "function") {
    (gtag as (...args: unknown[]) => void)("event", evento, params ?? {});
  }
}
