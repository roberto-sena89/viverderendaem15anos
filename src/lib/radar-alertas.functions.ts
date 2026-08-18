import { createServerFn } from "@tanstack/react-start";

export interface AlertaRadarDetalhes {
  ranking: { de: number; para: number };
  dy12m: number;
  preco: number;
  zona: string;
  variacao: number;
  serie: number[];
}

export interface AlertaRadar {
  id: string;
  ticker: string;
  tipo: string;
  titulo: string;
  corpo: string;
  detalhes: AlertaRadarDetalhes;
  criadoEm: string;
}

export const getRadarAlertas = createServerFn({ method: "GET" })
  .middleware([])
  .handler(async (): Promise<AlertaRadar[]> => {
    // Em um cenário real, isso leria do banco/IA.
    // Para o MVP, geramos alertas baseados em movimentos significativos.
    return [
      {
        id: "1",
        ticker: "PETR4",
        tipo: "oportunidade",
        titulo: "PETR4 em zona de oportunidade",
        corpo: "Ativo atingiu percentil 15%, aproximando-se da mínima histórica.",
        detalhes: {
          ranking: { de: 12, para: 3 },
          dy12m: 14.5,
          preco: 34.2,
          zona: "Mínima",
          variacao: -2.4,
          serie: [38, 37, 36, 35, 34.2, 34.5, 34.2],
        },
        criadoEm: new Date().toISOString(),
      },
      {
        id: "2",
        ticker: "VALE3",
        tipo: "mudanca",
        titulo: "Mudança no Rating: VALE3",
        corpo: "O Gestor IA elevou o rating de B para A após novos fundamentos.",
        detalhes: {
          ranking: { de: 8, para: 2 },
          dy12m: 8.2,
          preco: 62.15,
          zona: "Barata",
          variacao: 1.2,
          serie: [60, 61, 59, 60, 61, 62, 62.15],
        },
        criadoEm: new Date().toISOString(),
      },
    ];
  });
