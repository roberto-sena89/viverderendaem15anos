/**
 * Grade do Tesouro Direto.
 *
 * Fontes:
 * - Tesouro Transparente (CSV oficial) -> preço unitário e taxa de cada título,
 *   atualizados uma vez por dia útil.
 * - Banco Central (SGS) -> Meta Selic (432) e IPCA (433) usados no painel de
 *   resumo e na projeção nominal dos títulos indexados.
 */

import {
  anosEntre,
  classificar,
  defTipo,
  type LinhaTesouro,
  type RespostaTesouro,
} from "@/lib/tesouro-base";
import { listarTesouroDireto } from "@/lib/tesouro.server";

const memoria = new Map<string, { expira: number; valor: unknown }>();

async function json<T>(url: string, ttlMs: number): Promise<T | null> {
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) return cache.valor as T;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!res.ok) return null;
    const valor = (await res.json()) as T;
    memoria.set(url, { valor, expira: Date.now() + ttlMs });
    return valor;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type PontoSgs = { data: string; valor: string };

async function serieSgs(codigo: number, mesesAtras: number): Promise<PontoSgs[]> {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setMonth(inicio.getMonth() - mesesAtras);
  const br = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const dados = await json<PontoSgs[]>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${br(inicio)}&dataFinal=${br(fim)}`,
    3 * 60 * 60_000,
  );
  return Array.isArray(dados) ? dados : [];
}

const num = (p?: PontoSgs) => (p ? Number(p.valor.replace(",", ".")) : null);

async function indicadores() {
  const [selicPontos, ipcaPontos] = await Promise.all([serieSgs(432, 2), serieSgs(433, 14)]);
  const selic = num(selicPontos.at(-1));
  const valores = ipcaPontos.map((p) => num(p) ?? 0);
  const ipca12m = valores.length
    ? (valores.slice(-12).reduce((a, v) => a * (1 + v / 100), 1) - 1) * 100
    : null;
  return { selic, ipca12m, ipcaReferencia: ipcaPontos.at(-1)?.data ?? null };
}

/** Valor mínimo de aplicação: 1% do título, respeitando o piso de R$ 30. */
function minimoAplicacao(preco: number | null) {
  if (!preco) return null;
  return Math.min(preco, Math.max(30, preco * 0.01));
}

async function coletar(): Promise<RespostaTesouro> {
  const [titulos, macro] = await Promise.all([
    listarTesouroDireto().catch(() => []),
    indicadores(),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const dataBaseMaxima = titulos.reduce<string | null>(
    (m, t) => (t.dataBase && (!m || t.dataBase > m) ? t.dataBase : m),
    null,
  );

  // Só entram títulos ainda ofertados: vencimento futuro e presença na última
  // tabela publicada (com folga de alguns dias para feriados).
  const corte = dataBaseMaxima ? recuar(dataBaseMaxima, 7) : null;

  const linhas: LinhaTesouro[] = titulos
    .filter((t) => t.vencimento && t.vencimento > hoje && t.dataBase && (!corte || t.dataBase >= corte))
    .map((t) => {
      const tipo = classificar(t.nome);
      const def = defTipo(tipo);
      const anos = anosEntre(t.vencimento!);
      const taxa = t.taxaCompra;
      let estimada: number | null = null;
      if (taxa !== null) {
        if (def.indexador === "IPCA" && macro.ipca12m !== null) {
          estimada = ((1 + taxa / 100) * (1 + macro.ipca12m / 100) - 1) * 100;
        } else if (def.indexador === "SELIC" && macro.selic !== null) {
          estimada = macro.selic + taxa;
        } else if (def.indexador === "PRE") {
          estimada = taxa;
        }
      }
      return {
        id: `${tipo}-${t.vencimento}`,
        nome: t.nome,
        tipo,
        indexador: def.indexador,
        jurosSemestrais: def.jurosSemestrais,
        vencimento: t.vencimento!,
        dataBase: t.dataBase,
        taxaCompra: taxa,
        taxaVenda: t.taxaVenda,
        precoCompra: t.precoCompra,
        precoVenda: t.precoVenda,
        rentabilidadeEstimada:
          estimada !== null ? estimada - 0.2 /* custódia B3 */ : null,
        investimentoMinimo: minimoAplicacao(t.precoCompra ?? t.precoVenda),
        anosAteVencimento: anos,
        serie: t.serie,
      };
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return {
    linhas,
    precosDe: dataBaseMaxima,
    selic: macro.selic,
    ipca12m: macro.ipca12m,
    ipcaReferencia: macro.ipcaReferencia,
    proximoCopom: proximaReuniaoCopom(),
    proximoIpca: proximaDivulgacaoIpca(),
    atualizadoEm: new Date().toISOString(),
    parcial: linhas.length === 0 || macro.selic === null,
  };
}

function recuar(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** Copom se reúne a cada ~45 dias; usamos o calendário aproximado do ano. */
function proximaReuniaoCopom(): string | null {
  const ano = new Date().getFullYear();
  const meses = [0, 2, 4, 5, 7, 8, 10, 11]; // jan, mar, mai, jun, ago, set, nov, dez
  const hoje = new Date();
  for (const y of [ano, ano + 1]) {
    for (const m of meses) {
      const d = new Date(y, m, 18);
      if (d > hoje) return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

/** IBGE divulga o IPCA cheio por volta do dia 10 de cada mês. */
function proximaDivulgacaoIpca(): string | null {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
  if (d <= hoje) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

let emVoo: Promise<RespostaTesouro> | null = null;
let ultima: { valor: RespostaTesouro; expira: number } | null = null;
const TTL = 30 * 60_000; // preços mudam 1x por dia útil

/** Grade completa com cache compartilhado entre requisições. */
export async function buscarTesouro(forcar = false): Promise<RespostaTesouro> {
  if (!forcar && ultima && ultima.expira > Date.now()) return ultima.valor;
  if (emVoo) return emVoo;
  emVoo = (async () => {
    try {
      const valor = await coletar();
      if (!valor.linhas.length && ultima) return ultima.valor;
      ultima = { valor, expira: Date.now() + TTL };
      return valor;
    } catch (e) {
      if (ultima) return ultima.valor;
      throw e;
    } finally {
      emVoo = null;
    }
  })();
  return emVoo;
}
