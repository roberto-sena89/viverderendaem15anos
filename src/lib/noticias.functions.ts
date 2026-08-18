import { createServerFn } from "@tanstack/react-start";
import type { CategoriaNoticia, Noticia } from "@/lib/noticias.server";

export type { CategoriaNoticia, Noticia };

export interface EventoAgenda {
  id: string;
  titulo: string;
  detalhe: string;
  quando: string;
  tipo: "Brasil" | "EUA" | "Empresas";
}

export interface IndiceNoticias {
  simbolo: string;
  nome: string;
  preco: number | null;
  variacaoPercent: number | null;
}

/** Feed consolidado de notícias financeiras (RSS público, resumos próprios). */
export const listarNoticias = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ itens: Noticia[]; fontes: string[]; atualizadoEm: string }> => {
    const mod = await import("@/lib/noticias.server");
    const itens = await mod.agregarNoticias();
    return { itens, fontes: mod.FONTES_DISPONIVEIS, atualizadoEm: new Date().toISOString() };
  },
);

/** Índices exibidos na fita do topo da página de notícias. */
const INDICES = [
  { simbolo: "^BVSP", rotulo: "Ibovespa" },
  { simbolo: "IFIX.SA", rotulo: "IFIX" },
  { simbolo: "^GSPC", rotulo: "S&P 500" },
  { simbolo: "^IXIC", rotulo: "Nasdaq" },
  { simbolo: "BRL=X", rotulo: "Dólar" },
  { simbolo: "BTC-BRL", rotulo: "Bitcoin" },
];

export const indicesNoticias = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ itens: IndiceNoticias[]; atualizadoEm: string }> => {
    const mercado = await import("@/lib/market.server");
    const itens = await mercado.buscarFita(INDICES);
    return {
      itens: itens.map((i) => ({
        simbolo: i.simbolo,
        nome: i.nome,
        preco: i.preco,
        variacaoPercent: i.variacaoPercent,
      })),
      atualizadoEm: new Date().toISOString(),
    };
  },
);

/* ------------------------------------------------------------------ *
 * Agenda econômica
 * ------------------------------------------------------------------ */

/** Reuniões já calendarizadas (segundo dia, com a decisão divulgada). */
const COPOM = [
  "2026-01-28",
  "2026-03-18",
  "2026-05-06",
  "2026-06-17",
  "2026-08-05",
  "2026-09-16",
  "2026-11-04",
  "2026-12-09",
];
const FOMC = [
  "2026-01-28",
  "2026-03-18",
  "2026-04-29",
  "2026-06-17",
  "2026-07-29",
  "2026-09-16",
  "2026-11-04",
  "2026-12-16",
];

function primeiraSexta(ano: number, mes: number): Date {
  const d = new Date(Date.UTC(ano, mes, 1));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export const agendaEconomica = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventoAgenda[]> => {
    const agora = new Date();
    const eventos: EventoAgenda[] = [];

    for (const data of COPOM) {
      eventos.push({
        id: `copom-${data}`,
        titulo: "Decisão do Copom",
        detalhe: "Taxa Selic · Banco Central",
        quando: `${data}T21:30:00.000Z`,
        tipo: "Brasil",
      });
    }
    for (const data of FOMC) {
      eventos.push({
        id: `fomc-${data}`,
        titulo: "Decisão do Fed (FOMC)",
        detalhe: "Juros dos EUA",
        quando: `${data}T19:00:00.000Z`,
        tipo: "EUA",
      });
    }

    // IPCA (~dia 10), IPCA-15 (~dia 25) e payroll (1ª sexta) dos próximos 4 meses.
    for (let i = 0; i < 4; i++) {
      const base = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + i, 1));
      const ano = base.getUTCFullYear();
      const mes = base.getUTCMonth();
      const mesNome = base.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });

      eventos.push({
        id: `ipca-${ano}-${mes}`,
        titulo: "IPCA do mês",
        detalhe: `Inflação oficial · IBGE (${mesNome})`,
        quando: new Date(Date.UTC(ano, mes, 10, 12, 0)).toISOString(),
        tipo: "Brasil",
      });
      eventos.push({
        id: `ipca15-${ano}-${mes}`,
        titulo: "IPCA-15",
        detalhe: "Prévia da inflação · IBGE",
        quando: new Date(Date.UTC(ano, mes, 25, 12, 0)).toISOString(),
        tipo: "Brasil",
      });
      const sexta = primeiraSexta(ano, mes);
      sexta.setUTCHours(12, 30);
      eventos.push({
        id: `payroll-${ano}-${mes}`,
        titulo: "Payroll (EUA)",
        detalhe: "Relatório de emprego norte-americano",
        quando: sexta.toISOString(),
        tipo: "EUA",
      });

      // Temporada de balanços: divulgações concentradas em fev, mai, ago e nov.
      if ([1, 4, 7, 10].includes(mes)) {
        eventos.push({
          id: `balancos-${ano}-${mes}`,
          titulo: "Temporada de balanços",
          detalhe: "Resultados trimestrais das companhias da B3",
          quando: new Date(Date.UTC(ano, mes, 5, 21, 0)).toISOString(),
          tipo: "Empresas",
        });
      }
    }

    return eventos
      .filter((e) => new Date(e.quando).getTime() > agora.getTime() - 3 * 3_600_000)
      .sort((a, b) => a.quando.localeCompare(b.quando))
      .slice(0, 8);
  },
);
