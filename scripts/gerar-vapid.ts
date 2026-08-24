/**
 * Script para gerar chaves VAPID (Voluntary Application Server Identification)
 * para Web Push. Executar:
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/gerar-vapid.ts
 *
 * Imprime as chaves e mostra instruções de onde colocar cada uma.
 * Opcional: passe --salvar para tentar escrever no .env.local.
 */

import webPush from "web-push";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const salvar = args.includes("--salvar");

async function main() {
  console.log("Gerando chaves VAPID para Web Push...\n");

  const keys = webPush.generateVAPIDKeys();

  console.log("=== CHAVE PÚBLICA (pode ir para o navegador) ===");
  console.log(keys.publicKey);
  console.log();
  console.log("=== CHAVE PRIVADA (NUNCA compartilhar) ===");
  console.log(keys.privateKey);
  console.log();

  const publicKey = keys.publicKey;
  const privateKey = keys.privateKey;

  // Configurações
  const envLocal = resolve(process.cwd(), ".env.local");
  const env = resolve(process.cwd(), ".env");
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@viverderendaem15anos.app";

  if (salvar) {
    let salvas = 0;

    // .env (público, VITE_ prefix — gitignored, mas seguro)
    if (existsSync(env)) {
      const conteudo = readFileSync(env, "utf-8");
      if (!conteudo.includes("VITE_VAPID_PUBLIC_KEY")) {
        appendFileSync(env, `\nVITE_VAPID_PUBLIC_KEY=${publicKey}\n`);
        console.log(`✅  VITE_VAPID_PUBLIC_KEY adicionada ao .env`);
        salvas++;
      } else {
        console.log(`⚠️   VITE_VAPID_PUBLIC_KEY já existe no .env`);
      }
    }

    // .env.local (privado, chave secreta)
    if (existsSync(envLocal) || salvar) {
      let localLines = "";
      if (existsSync(envLocal)) {
        localLines = readFileSync(envLocal, "utf-8");
      }
      const adicoes: string[] = [];
      if (!localLines.includes("VAPID_PUBLIC_KEY")) {
        adicoes.push(`VAPID_PUBLIC_KEY=${publicKey}`);
      }
      if (!localLines.includes("VAPID_PRIVATE_KEY")) {
        adicoes.push(`VAPID_PRIVATE_KEY=${privateKey}`);
      }
      if (!localLines.includes("VAPID_SUBJECT")) {
        adicoes.push(`VAPID_SUBJECT=${subject}`);
      }
      if (adicoes.length > 0) {
        appendFileSync(envLocal, `\n# Web Push VAPID\n${adicoes.join("\n")}\n`);
        console.log(`✅  ${adicoes.length} variável(is) adicionada(s) ao .env.local`);
        salvas += adicoes.length;
      } else {
        console.log(`ℹ️   Todas as variáveis VAPID já existem no .env.local`);
      }
    }

    if (salvas === 0) {
      console.log("\nℹ️  Nenhuma variável foi salva. Copie manualmente para .env.local:");
      console.log("   VAPID_PUBLIC_KEY=<a chave pública acima>");
      console.log("   VAPID_PRIVATE_KEY=<a chave privada acima>");
      console.log("   VAPID_SUBJECT=mailto:seu-email@provedor.com");
      console.log("   VITE_VAPID_PUBLIC_KEY=<a chave pública acima> (no .env ou .env.local)");
    }
  } else {
    console.log("Para salvar automaticamente, execute com --salvar:");
    console.log("  npx tsx --env-file-if-exists=.env.local scripts/gerar-vapid.ts --salvar\n");
    console.log("Copie manualmente para os arquivos:");
    console.log("  .env:          VITE_VAPID_PUBLIC_KEY=<a chave pública>");
    console.log("  .env.local:    VAPID_PUBLIC_KEY=<a chave pública>");
    console.log("  .env.local:    VAPID_PRIVATE_KEY=<a chave privada>");
    console.log("  .env.local:    VAPID_SUBJECT=mailto:seu-email@provedor.com");
  }
}

main().catch(console.error);
