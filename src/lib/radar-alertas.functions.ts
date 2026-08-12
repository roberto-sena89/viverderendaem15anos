import { createServerFn } from "@tanstack/react-start";


export const getRadarAlertas = createServerFn({ method: "GET" })
  .middleware([])
  .handler(async () => {
    // Em um cenário real, isso leria do banco/IA.
    // Para o MVP, geramos alertas baseados em movimentos significativos.
    return [
      {
        id: "1",
        ticker: "PETR4",
        tipo: "oportunidade",
        titulo: "PETR4 em zona de oportunidade",
        corpo: "Ativo atingiu percentil 15%, aproximando-se da mínima histórica.",
        lido: false,
        criadoEm: new Date().toISOString(),
      },
      {
        id: "2",
        ticker: "VALE3",
        tipo: "mudanca",
        titulo: "Mudança no Rating: VALE3",
        corpo: "O Técnico IA elevou o rating de B para A após novos fundamentos.",
        lido: false,
        criadoEm: new Date().toISOString(),
      }
    ];
  });
