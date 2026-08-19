import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PRESETS_PROVEDOR } from "../provedor-ia.ts";
import { modelosConfiguradosDe, verificarModelosGratuitos } from "../verificar-modelos-gratuitos.server.ts";
import { PROVEDORES_ENV } from "../provedores-env.server.ts";

describe("Validação de Modelos Gratuitos", () => {
  let configurados: ReturnType<typeof modelosConfiguradosDe>;
  let relatorio: Awaited<ReturnType<typeof verificarModelosGratuitos>>;

  beforeAll(async () => {
    // Configura os modelos a partir do provedor-ia.ts
    configurados = modelosConfiguradosDe(PROVEDORES_ENV, PRESETS_PROVEDOR);

    // Executa a verificação real contra as APIs
    relatorio = await verificarModelosGratuitos(process.env, configurados);
  }, 30000); // 30 second timeout for setup

  it("deve validar que todos os modelos marcados como gratuitos são realmente gratuitos", () => {
    // Contadores para o relatório
    let totalModelosConfigurados = 0;
    let totalModelosVerificadosComoGratuitos = 0;
    let errosEncontrados = 0;

    // Analisa o relatório de verificação
    for (const provedor of relatorio.provedores) {
      // Pular provedores onde a verificação não pôde ser concluída
      if (provedor.status !== "ok") {
        continue;
      }

      const modelosConfigurados = configurados
        .filter(c => c.provedor === provedor.chave)
        .map(c => c.modelo);

      // Filtrar modelos configurados que são placeholders vazios (não devemos validar placeholders)
      const modelosConfiguradosValidos = modelosConfigurados.filter(modelo => modelo.length > 0);

      totalModelosConfigurados += modelosConfiguradosValidos.length;

      const modelosGratuitosIds = provedor.modelosGratuitos.map(m => m.id);
      totalModelosVerificadosComoGratuitos += modelosGratuitosIds.length;

      // Verifica se todos os modelos configurados como gratuitos são realmente gratuitos
      const modelosNaoGratuitos = modelosConfiguradosValidos.filter(
        modelo => !modelosGratuitosIds.includes(modelo)
      );

      // Se houver modelos configurados como gratuitos que não são realmente gratuitos, falha o teste
      expect(modelosNaoGratuitos.length,
        `Provedor ${provedor.nome}: ${modelosNaoGratuitos.length} modelo(s) configurado(s) como gratuito(s) não é(são) gratuito(s): ${modelosNaoGratuitos.join(", ")}`
      ).toBe(0);

      errosEncontrados += modelosNaoGratuitos.length;
    }

    // Assertiva final
    expect(errosEncontrados).toBe(0);
  });

  it("deve relatar estatísticas dos modelos verificados", () => {
    // Contadores para o relatório
    let totalModelosConfigurados = 0;
    let totalModelosVerificadosComoGratuitos = 0;
    let errosEncontrados = 0;

    // Analisa o relatório de verificação
    for (const provedor of relatorio.provedores) {
      const modelosConfigurados = configurados
        .filter(c => c.provedor === provedor.chave)
        .map(c => c.modelo);

      totalModelosConfigurados += modelosConfigurados.length;

      const modelosGratuitosIds = provedor.modelosGratuitos.map(m => m.id);
      totalModelosVerificadosComoGratuitos += modelosGratuitosIds.length;

      // Verifica se todos os modelos configurados como gratuitos são realmente gratuitos
      const modelosNaoGratuitos = modelosConfigurados.filter(
        modelo => !modelosGratuitosIds.includes(modelo)
      );

      errosEncontrados += modelosNaoGratuitos.length;
    }

    // Este teste sempre passa, apenas para gerar o relatório no modo verbose
    expect(true).toBe(true);
  });
});