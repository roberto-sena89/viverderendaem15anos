#!/usr/bin/env node
/**
 * Falha o build quando existir uma correção instalável para uma dependência
 * vulnerável que hoje está bloqueada (ex.: brace-expansion).
 *
 * Regra: uma versão corrigida só é considerada "instalável" depois de
 * MIN_RELEASE_AGE_HOURS (política de minimum-release-age do registry).
 */

const MIN_RELEASE_AGE_HOURS = Number(process.env.MIN_RELEASE_AGE_HOURS ?? 24);

/** Pacotes vigiados: primeira versão corrigida por linha de major. */
const WATCHED = [
  { name: "brace-expansion", fixed: ["1.1.18", "2.1.4", "5.0.9"] },
  { name: "uuid", fixed: ["14.0.2"] },
];

const hoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 36e5;

async function fetchPackument(name) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (!res.ok) throw new Error(`registry respondeu ${res.status} para ${name}`);
  return res.json();
}

const actionable = [];

for (const pkg of WATCHED) {
  let packument;
  try {
    packument = await fetchPackument(pkg.name);
  } catch (err) {
    console.warn(`aviso: não foi possível consultar ${pkg.name}: ${err.message}`);
    continue;
  }

  const times = packument.time ?? {};
  for (const version of pkg.fixed) {
    const publishedAt = times[version];
    if (!publishedAt) {
      console.log(`- ${pkg.name}@${version}: ainda não publicado`);
      continue;
    }
    const age = hoursSince(publishedAt);
    if (age >= MIN_RELEASE_AGE_HOURS) {
      actionable.push(`${pkg.name}@${version} (publicado há ${Math.floor(age)}h)`);
    } else {
      console.log(
        `- ${pkg.name}@${version}: publicado há ${age.toFixed(1)}h, ainda bloqueado pela política de ${MIN_RELEASE_AGE_HOURS}h`,
      );
    }
  }
}

if (actionable.length > 0) {
  console.error("\n❌ Correções de segurança já instaláveis — aplique os overrides:");
  for (const item of actionable) console.error(`   • ${item}`);
  console.error(
    '\nAdicione/ajuste "overrides" no package.json e rode `bun install --save-text-lockfile`.\n',
  );
  process.exit(1);
}

console.log("\n✅ Nenhuma correção pendente instalável no momento.");
