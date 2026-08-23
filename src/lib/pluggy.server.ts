/**
 * Serviço server-only de integração com o "Meu Pluggy" (rota gratuita).
 *
 * O Meu Pluggy é a API pessoal e gratuita de Open Finance da Pluggy
 * (https://meu.pluggy.ai). Você conecta suas contas (ex.: Ágora Investimentos /
 * Bradesco) lá e usa as credenciais (Client ID + Client Secret) do Dashboard
 * Pluggy para puxar as posições de investimentos para o seu próprio projeto.
 *
 * Segurança: as credenciais (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET) e o
 * apiKey gerado NUNCA saem do servidor — o cliente conversa apenas com as
 * server functions em `src/lib/pluggy.functions.ts`.
 */

const API_BASE = "https://api.pluggy.ai";
const API_KEY_TTL_MS = 2 * 60 * 60 * 1000; // apiKey expira em 2h

interface ApiKeyResponse {
  apiKey: string;
}

interface Item {
  id: string;
  connector: { id: number; name: string } | null;
  institution?: { name?: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemsResponse {
  page: number;
  total: number;
  totalPages: number;
  results: Item[];
}

interface InvestmentsResponse {
  page: number;
  total: number;
  totalPages: number;
  results: InvestmentPluggy[];
}

/** Posição de investimento devolvida pela API da Pluggy. */
export interface InvestmentPluggy {
  id: string;
  code: string | null;
  name: string;
  balance: number;
  currencyCode: string;
  type: string;
  subtype: string | null;
  quantity: number | null;
  amount: number | null;
  value: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  date: string | null;
  status: string | null;
  itemId: string;
}

let cacheApiKey: { apiKey: string; expiraEm: number } | null = null;

function credenciais(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "[Pluggy] Credenciais ausentes. Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET (do Dashboard do Meu Pluggy).",
    );
  }
  return { clientId, clientSecret };
}

async function obterApiKey(): Promise<string> {
  const agora = Date.now();
  if (cacheApiKey && agora < cacheApiKey.expiraEm) return cacheApiKey.apiKey;

  const { clientId, clientSecret } = credenciais();
  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    if (res.status === 401)
      throw new Error("[Pluggy] Credenciais inválidas. Confira Client ID e Client Secret.");
    throw new Error(`[Pluggy] Falha ao autenticar (HTTP ${res.status}).`);
  }

  const json = (await res.json()) as ApiKeyResponse;
  cacheApiKey = { apiKey: json.apiKey, expiraEm: agora + API_KEY_TTL_MS - 60_000 };
  return json.apiKey;
}

async function pluggyGet<T>(caminho: string): Promise<T> {
  const apiKey = await obterApiKey();
  const res = await fetch(`${API_BASE}${caminho}`, {
    headers: { "X-API-KEY": apiKey },
  });

  if (res.status === 401 || res.status === 403) {
    cacheApiKey = null;
    throw new Error("[Pluggy] Acesso negado. Reautorize a conexão no Meu Pluggy.");
  }
  if (!res.ok) {
    throw new Error(`[Pluggy] Falha na requisição ${caminho} (HTTP ${res.status}).`);
  }
  return (await res.json()) as T;
}

async function pluggyPost<T>(caminho: string, corpo: unknown): Promise<T> {
  const apiKey = await obterApiKey();
  const res = await fetch(`${API_BASE}${caminho}`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (res.status === 401 || res.status === 403) {
    cacheApiKey = null;
    throw new Error("[Pluggy] Acesso negado. Reautorize a conexão no Meu Pluggy.");
  }
  if (!res.ok) {
    throw new Error(`[Pluggy] Falha na requisição ${caminho} (HTTP ${res.status}).`);
  }
  return (await res.json()) as T;
}

/**
 * Gera um connect token para embutir o widget Pluggy Connect (fluxo de
 * consentimento Open Finance). O connectToken é curto (30 min), por isso é
 * gerado aqui no servidor, sob demanda, e nunca é armazenado.
 *
 * - `clientUserId`: vincula cada item criado no widget ao usuário autenticado.
 * - `avoidDuplicates`: evita criar um novo item se já existir conexão com as
 *   mesmas credenciais.
 */
export async function criarConnectToken(clientUserId: string): Promise<string> {
  const res = await pluggyPost<{ accessToken: string }>("/connect_token", {
    options: {
      clientUserId,
      avoidDuplicates: true,
    },
  });
  return res.accessToken;
}

/* ------------------------------------------------------------------ *
 * Tipos de investimento Open Finance → categorias do app
 * ------------------------------------------------------------------ */

const FUNIS = ["MUTUAL_FUND", "FUND"];
const RENDA_FIXA = ["FIXED", "FIXED_INCOME", "SECURITY", "COE", "TREASURY", "CDB", "LCI", "LCA"];
const FII = ["REAL_ESTATE", "FII", "FUNDO_IMOBILIARIO"];

/** Normaliza o tipo devolvido pela Pluggy para uma categoria do app. */
export function categoriaDePluggy(tipo: string, nome = ""): string {
  const t = (tipo || "").toUpperCase();
  const n = (nome || "").toUpperCase();
  if (t.includes("EQUITY") || t.includes("STOCK") || t.includes("VARIABLE"))
    return "Ações";
  if (FII.some((f) => t.includes(f)) || n.includes("FII") || n.includes("FUNDO IMOBILI"))
    return "FIIS";
  if (t.includes("ETF")) return "ETF Brasil";
  if (FUNIS.some((f) => t.includes(f)) || n.includes("FUNDO"))
    return "Fundos de Investimentos";
  if (RENDA_FIXA.some((f) => t.includes(f))) return "Renda Fixa";
  return "Renda Fixa";
}

/** Padrão de ticker negociado na B3 (4 letras + dígitos), ex.: B3SA3, HGLG11, AAPL34. */
const RE_TICKER_B3 = /\b[A-Z]{4}(?:3|4|5|6|11|31|32|33|34|35|39)\b/;

/** Tenta extrair um ticker (ex.: B3SA3, HGBS11) do código/nome do ativo. */
export function tickerDePluggy(code: string | null, name: string): string {
  const texto = `${code ?? ""} ${name}`.toUpperCase();
  const achado = texto.match(RE_TICKER_B3);
  return achado?.[0] ?? (code ?? name).trim().toUpperCase().slice(0, 12);
}

/**
 * Indica se o ticker foi realmente reconhecido como código da B3. Quando falso
 * (ex.: "CDB BANCO BRADESCO"), o valor é apenas um rótulo e não deve ser usado
 * para casar/criar linhas na carteira automaticamente.
 */
export function tickerConfiavel(code: string | null, name: string): boolean {
  return RE_TICKER_B3.test(`${code ?? ""} ${name}`.toUpperCase());
}

/* ------------------------------------------------------------------ *
 * Operações principais
 * ------------------------------------------------------------------ */

/** Lista todos os itens (conexões) da conta do Meu Pluggy. */
export async function listarItensPluggy(): Promise<Item[]> {
  const { results } = await pluggyGet<ItemsResponse>("/items?pageSize=50");
  return results ?? [];
}

/** Lista os investimentos de um item (conexão). Pagina até esgotar. */
export async function listarInvestimentosPluggy(itemId: string): Promise<InvestmentPluggy[]> {
  const todos: InvestmentPluggy[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await pluggyGet<InvestmentsResponse>(
      `/investments?itemId=${encodeURIComponent(itemId)}&page=${page}&pageSize=100`,
    );
    todos.push(...(res?.results ?? []));
    totalPages = res?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return todos;
}

/** Detalhe de um item (conexão) — usado pelos webhooks (GET /items/{id}). */
export interface ItemDetalhePluggy {
  id: string;
  clientId: string | null;
  clientUserId: string | null;
  status: string | null;
  connector: { id: number; name: string } | null;
  webhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdatedAt: string | null;
}

/** Busca as informações mais recentes de um item pelo id (recomendado nos webhooks). */
export async function obterItemPluggy(itemId: string): Promise<ItemDetalhePluggy> {
  return pluggyGet<ItemDetalhePluggy>(`/items/${encodeURIComponent(itemId)}`);
}

export interface PosicaoPluggy {
  id: string;
  itemId: string;
  itemNome: string;
  ticker: string;
  /** true quando o ticker foi reconhecido como código real da B3. */
  tickerReconhecido: boolean;
  nome: string;
  tipo: string;
  categoria: string;
  quantidade: number;
  valorAtual: number;
  valorCusto: number | null;
  currencyCode: string;
  atualizadoEm: string | null;
}

/** Agrega todos os investimentos de todas as conexões do Meu Pluggy. */
export async function listarPosicoesPluggy(): Promise<PosicaoPluggy[]> {
  const itens = (await listarItensPluggy()).filter((i) => i.status === "UPDATED");
  const posicoes: PosicaoPluggy[] = [];

  for (const item of itens) {
    const investimentos = await listarInvestimentosPluggy(item.id);
    for (const inv of investimentos) {
      const quantidade = Number(inv.quantity) || 0;
      const valorAtual = Number(inv.balance) || Number(inv.amount) || 0;
      const valorCusto = Number(inv.amountOriginal) || null;
      posicoes.push({
        id: inv.id,
        itemId: item.id,
        itemNome: item.connector?.name ?? item.institution?.name ?? "Meu Pluggy",
        ticker: tickerDePluggy(inv.code, inv.name),
        nome: inv.name,
        tipo: inv.type,
        categoria: categoriaDePluggy(inv.type, inv.name),
        quantidade,
        valorAtual,
        valorCusto,
        currencyCode: inv.currencyCode ?? "BRL",
        atualizadoEm: inv.date ?? item.updatedAt ?? null,
      });
    }
  }

  return posicoes;
}

