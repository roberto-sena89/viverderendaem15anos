import { readFileSync } from "node:fs";

const caminho = process.argv[2];
if (!caminho) {
  console.error("Uso: node scripts/validate-sarif.mjs <arquivo.sarif>");
  process.exit(2);
}

let conteudo;
try {
  conteudo = readFileSync(caminho, "utf8");
} catch (err) {
  console.error(`Relatório SARIF ausente (${caminho}): ${err.message}`);
  process.exit(1);
}

let sarif;
try {
  sarif = JSON.parse(conteudo);
} catch (err) {
  console.error(`Relatório SARIF não é JSON válido (${caminho}): ${err.message}`);
  process.exit(1);
}

const valido =
  typeof sarif === "object" &&
  sarif !== null &&
  sarif.version === "2.1.0" &&
  Array.isArray(sarif.runs) &&
  sarif.runs.every((r) => r && typeof r === "object" && Array.isArray(r.tool?.driver?.rules ?? []));

if (!valido) {
  console.error(`Relatório SARIF inválido (${caminho}): esperado objeto com version "2.1.0" e runs[].`);
  process.exit(1);
}

console.log(`Relatório SARIF válido (${sarif.runs.length} run(s)).`);