/**
 * Verificação diária dos modelos gratuitos dos provedores de IA.
 *
 * Executa a verificação, imprime o relatório no console e grava o resultado
 * em data/modelos-gratuitos.json. Sai com código 1 quando algum modelo
 * cadastrado no código deixou de ser gratuito (para alertar o agendador).
 *
 * Uso: node scripts/verificar-modelos.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { PROVEDORES_ENV } from "../src/lib/provedores-env.server.ts";
import { PRESETS_PROVEDOR } from "../src/lib/provedor-ia.ts";
import {
  modelosConfiguradosDe,
  verificarModelosGratuitos,
} from "../src/lib/verificar-modelos-gratuitos.server.ts";

const configurados = modelosConfiguradosDe(PROVEDORES_ENV, PRESETS_PROVEDOR);
const relatorio = await verificarModelosGratuitos(process.env, configurados);

const pastaDados = new URL("../data/", import.meta.url);
await mkdir(pastaDados, { recursive: true });
await writeFile(
  new URL("modelos-gratuitos.json", pastaDados),
  JSON.stringify(relatorio, null, 2),
  "utf8",
);

console.log(
  `Verificação de modelos gratuitos — ${new Date(relatorio.geradoEm).toLocaleString("pt-BR")}`,
);
for (const p of relatorio.provedores) {
  const status = p.status === "ok" ? "OK" : p.status === "sem-chave" ? "SEM CHAVE" : "ERRO";
  console.log(`\n${p.nome} [${status}] ${p.mensagem}`);
  for (const m of p.modelosGratuitos.slice(0, 8)) {
    console.log(`  - ${m.id}${m.ctx ? ` (${m.ctx.toLocaleString("pt-BR")} tokens)` : ""}`);
  }
  if (p.modelosGratuitos.length > 8) {
    console.log(`  … e mais ${p.modelosGratuitos.length - 8} modelos gratuitos`);
  }
}

if (relatorio.desaparecidos.length > 0) {
  console.log("\nALERTA — modelos configurados não estão mais gratuitos no catálogo:");
  for (const d of relatorio.desaparecidos) {
    console.log(`  - ${d.provedor}: ${d.modelo}`);
  }
}

console.log(`\nResumo: ${relatorio.resumo}`);
if (relatorio.desaparecidos.length > 0) process.exitCode = 1;
