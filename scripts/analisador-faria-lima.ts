#!/usr/bin/env tsx
/**
 * Analisador Faria Lima — CLI profissional em tempo real
 * Uso:
 *   bun scripts/analisador-faria-lima.ts
 *   tsx scripts/analisador-faria-lima.ts --json
 *   tsx scripts/analisador-faria-lima.ts --md > briefing.md
 */
import { analisarFariaLima } from "../src/lib/faria-lima-analise.server";

function fmt(v: number | null | undefined, casas = 2, sufixo = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(casas)}${sufixo}`;
}

function linhaOp(o: ReturnType<typeof analisarFariaLima> extends Promise<infer U> ? U extends { topValor: Array<infer T> } ? T : never : never) {
  // @ts-ignore
  const op = o as { ticker: string; nome: string; categoria: string; setor: string | null; preco: number | null; dy12: number | null; pvp: number | null; percentil: number | null; score: number | null; risco: string; tese: string };
  return `${op.ticker.padEnd(7)} | ${String(op.categoria).padEnd(4)} | score ${String(op.score).padStart(3)} | ${String(op.percentil !== null ? fmt(op.percentil, 0, "%") : "—").padStart(4)} | DY ${fmt(op.dy12, 1, "%").padStart(6)} | P/VP ${fmt(op.pvp, 2).padStart(5)} | risco ${op.risco.padEnd(5)} | ${op.tese.slice(0, 110)}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const asMd = args.has("--md");

  console.error("▶ Faria Lima Quant — varrendo B3 em tempo real (Kilo Code principal)…");
  const t0 = Date.now();
  const b = await analisarFariaLima();
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  if (asJson) {
    console.log(JSON.stringify(b, null, 2));
    return;
  }

  if (asMd) {
    console.log(`# Briefing Faria Lima — ${new Date(b.geradoEm).toLocaleString("pt-BR")}\n`);
    console.log(`> ${b.resumoExecutivo}\n`);
    console.log(`**Macro:** Selic ${fmt(b.macro.selic, 2, "%")} · IPCA ${fmt(b.macro.ipca, 2, "%")} · Universo ${b.universo.acoes} ações + ${b.universo.fiis} FIIs · ${b.universo.candidatos} candidatos\n`);
    const sec = (titulo: string, arr: typeof b.topValor) => {
      console.log(`## ${titulo}\n`);
      console.log(`| Ticker | Score | %Hist | DY | P/VP | Risco | Tese |`);
      console.log(`|---|---|---|---|---|---|---|`);
      for (const o of arr) console.log(`| ${o.ticker} | ${o.score} | ${fmt(o.percentil, 0, "%")} | ${fmt(o.dy12, 1, "%")} | ${fmt(o.pvp, 2)} | ${o.risco} | ${o.tese.replaceAll("|", "/").slice(0, 120)} |`);
      console.log("");
    };
    sec("Valor (margem de segurança)", b.topValor);
    sec("Dividendos (renda com desconto)", b.topDividendos);
    sec("FIIs", b.topFiis);
    sec("Contrarian (tático, com stop)", b.contrarian);
    if (b.alertas.length) {
      console.log(`## Alertas\n`);
      for (const a of b.alertas) console.log(`- **${a.nivel.toUpperCase()}** ${a.titulo}: ${a.detalhe}`);
      console.log("");
    }
    console.log(`---\n*${b.metodologia}* · *${b.provedor}* · ${dt}s`);
    return;
  }

  // Console profissional
  console.log("\n" + "=".repeat(90));
  console.log("  FARIALIMA QUANT — BRIEFING EXECUTIVO");
  console.log("=".repeat(90));
  console.log(`Gerado: ${new Date(b.geradoEm).toLocaleString("pt-BR")} · ${dt}s · ${b.provedor}`);
  console.log(`Macro: Selic ${fmt(b.macro.selic, 2, "%")} | IPCA ${fmt(b.macro.ipca, 2, "%")} | Universo ${b.universo.acoes} ações + ${b.universo.fiis} FIIs → ${b.universo.candidatos} candidatos`);
  console.log("\nResumo:\n  " + b.resumoExecutivo.replaceAll(" ", " ").slice(0, 400) + "\n");

  const printSec = (titulo: string, arr: typeof b.topValor) => {
    console.log("-".repeat(90));
    console.log(`  ${titulo.toUpperCase()} (${arr.length})`);
    console.log("-".repeat(90));
    console.log("  TICKER  CAT  SCORE  %HIST    DY    P/VP  RISCO  TESE");
    for (const o of arr) console.log("  " + linhaOp(o as never));
    if (!arr.length) console.log("  (sem oportunidades nesta categoria agora)");
  };
  printSec("Valor — margem de segurança", b.topValor);
  printSec("Dividendos — renda com desconto", b.topDividendos);
  printSec("FIIs — tijolo/papel", b.topFiis);
  printSec("Contrarian — tático com stop", b.contrarian);

  if (b.alertas.length) {
    console.log("\n" + "!".repeat(90));
    console.log("  ALERTAS");
    for (const a of b.alertas) console.log(`  [${a.nivel.toUpperCase()}] ${a.titulo}: ${a.detalhe}`);
  }
  console.log("\nMetodologia: " + b.metodologia);
  console.log("=".repeat(90) + "\n");
}

main().catch((e) => {
  console.error("Falha:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
