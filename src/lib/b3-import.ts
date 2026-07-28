/**
 * Leitura, validação e mapeamento automático dos relatórios exportados pela
 * Área do Investidor da B3 (Extrato de Negociação, Extrato de Movimentação e
 * Posição) em CSV ou Excel.
 */
import * as XLSX from "xlsx";
import type { Categoria } from "@/lib/portfolio";

export interface AporteB3 {
  data: string;
  corretora: string;
  ticker: string;
  categoria: Categoria;
  quantidade: number;
  preco: number;
  taxas: number;
  observacoes?: string;
}

export interface DividendoB3 {
  data: string;
  ticker: string;
  tipo: string;
  valor: number;
}

export type Severidade = "erro" | "aviso" | "info";

export interface DiagnosticoB3 {
  severidade: Severidade;
  titulo: string;
  detalhe: string;
  linhas?: number[];
}

export type LayoutB3 = "negociacao" | "movimentacao" | "posicao" | "corretora" | "desconhecido";

export type OrigemArquivo = "b3" | "agora" | "generico";


export interface MapeamentoCampo {
  campo: string;
  coluna: string | null;
  obrigatorio: boolean;
}

export interface ResultadoB3 {
  aportes: AporteB3[];
  dividendos: DividendoB3[];
  vendas: number;
  ignoradas: number;
  layout: LayoutB3;
  layoutRotulo: string;
  abas: string[];
  totalLinhas: number;
  mapeamento: MapeamentoCampo[];
  diagnosticos: DiagnosticoB3[];
  podeImportar: boolean;
}

const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** Sinônimos aceitos por campo lógico, em ordem de prioridade (B3 e corretoras). */
const CAMPOS: Record<string, string[]> = {
  ticker: [
    "Código de Negociação",
    "Codigo de Negociacao",
    "Produto",
    "Ativo",
    "Papel",
    "Ticker",
    "Título",
    "Titulo",
    "Especificação do Ativo",
    "Especificacao",
    "Negócio",
  ],
  data: [
    "Data do Negócio",
    "Data do Negocio",
    "Data Pregão",
    "Data Pregao",
    "Data da Operação",
    "Data da Operacao",
    "Data",
    "Data Referência",
    "Data Referencia",
    "Data Liquidação",
  ],
  movimento: [
    "Tipo de Movimentação",
    "Tipo de Movimentacao",
    "Movimentação",
    "Movimentacao",
    "Entrada/Saída",
    "Entrada/Saida",
    "Tipo de Operação",
    "Tipo Negócio",
    "Tipo Negocio",
    "Natureza",
    "Operação",
    "Operacao",
    "Compra/Venda",
    "C/V",
  ],
  quantidade: ["Quantidade", "Qtde", "Qtd", "Quantidade Executada", "Quantidade Negociada", "Qtd. Negociada", "Q Compra"],
  preco: [
    "Preço",
    "Preco",
    "Preço unitário",
    "Preco unitario",
    "Preço/Ajuste",
    "Preco/Ajuste",
    "Valor Unitário",
    "Valor Unitario",
    "Preço Médio",
    "Preco Medio",
    "Preço de Fechamento",
  ],
  valor: [
    "Valor da Operação",
    "Valor da Operacao",
    "Valor Líquido",
    "Valor Liquido",
    "Valor Bruto",
    "Financeiro",
    "Valor",
    "Valor Total",
    "Valor Atualizado",
  ],
  taxas: ["Taxas", "Corretagem", "Emolumentos", "Custos", "Taxa de Liquidação", "Total de Custos"],
  instituicao: ["Instituição", "Instituicao", "Corretora", "Participante", "Agente", "Assessor"],
  mercado: ["Mercado", "Tipo de Ativo", "Tipo"],
};

const OBRIGATORIOS = ["ticker", "data"];


function acharColuna(cabecalhos: string[], sinonimos: string[]): string | null {
  const normalizados = cabecalhos.map((c) => ({ original: c, norm: semAcento(c) }));
  for (const s of sinonimos) {
    const alvo = semAcento(s);
    const exato = normalizados.find((c) => c.norm === alvo);
    if (exato) return exato.original;
  }
  for (const s of sinonimos) {
    const alvo = semAcento(s);
    const parcial = normalizados.find((c) => c.norm.includes(alvo) || alvo.includes(c.norm));
    if (parcial && parcial.norm.length > 2) return parcial.original;
  }
  return null;
}

function detectarLayout(cabecalhos: string[]): { layout: LayoutB3; rotulo: string } {
  const set = cabecalhos.map(semAcento);
  const tem = (t: string) => set.some((c) => c.includes(t));
  if (tem("data do negocio") || (tem("codigo de negociacao") && tem("preco") && tem("quantidade") && !tem("entrada/saida")))
    return { layout: "negociacao", rotulo: "Extrato de Negociação (B3)" };
  if (tem("entrada/saida") || tem("movimentacao"))
    return { layout: "movimentacao", rotulo: "Extrato de Movimentação (B3)" };
  if (tem("preco de fechamento") || tem("valor atualizado") || (tem("produto") && !tem("data")))
    return { layout: "posicao", rotulo: "Relatório de Posição" };
  if (
    (tem("papel") || tem("titulo") || tem("especificacao")) &&
    (tem("preco/ajuste") || tem("tipo negocio") || tem("data pregao") || tem("corretagem") || tem("valor liquido"))
  )
    return { layout: "corretora", rotulo: "Relatório de corretora (nota/negócios)" };
  return { layout: "desconhecido", rotulo: "Layout não identificado" };
}

/** Identifica a origem do arquivo pelo nome e pelo conteúdo das colunas/instituição. */
function detectarOrigem(nomeArquivo: string, textoAmostra: string): { origem: OrigemArquivo; rotulo: string } {
  const alvo = semAcento(`${nomeArquivo} ${textoAmostra}`);
  if (alvo.includes("agora") || alvo.includes("bradesco")) return { origem: "agora", rotulo: "Ágora Investimentos" };
  if (alvo.includes("b3") || alvo.includes("investidor")) return { origem: "b3", rotulo: "B3 — Área do Investidor" };
  return { origem: "generico", rotulo: "Origem não identificada" };
}


export function numeroBR(valor: string): number {
  if (!valor) return 0;
  const limpo = valor
    .replace(/r\$/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function dataISO(valor: string): string | null {
  const v = valor.trim();
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const serial = Number(v);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Extrai o código de negociação de "PETR4 - PETROLEO BRASILEIRO" ou "MXRF11". */
export function extrairTicker(produto: string): string {
  const bruto = produto.split(/\s+-\s+/)[0].trim().toUpperCase();
  const m = bruto.match(/[A-Z]{4}\d{1,2}[A-Z]?/);
  return (m?.[0] ?? bruto.split(/\s/)[0] ?? "").toUpperCase();
}

export function tickerValido(ticker: string): boolean {
  return /^[A-Z]{4}\d{1,2}[A-Z]?$/.test(ticker);
}

export function categoriaDoTicker(ticker: string, mercado = ""): Categoria {
  const m = semAcento(mercado);
  if (m.includes("fundo imobiliario") || m.includes("fii")) return "FIIs";
  if (/11B?$/.test(ticker)) return "FIIs";
  if (/(3|4|5|6)$/.test(ticker)) return "Ações";
  if (/3[1-9]$/.test(ticker)) return "ETF EUA";
  return "Ações";
}

const TIPOS_PROVENTO = ["dividendo", "juros sobre capital", "rendimento", "jcp"];

interface Aba {
  nome: string;
  cabecalhos: string[];
  linhas: Record<string, unknown>[];
}

async function lerAbas(arquivo: File): Promise<Aba[]> {
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
  const abas: Aba[] = [];
  for (const nome of wb.SheetNames) {
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], { header: 1, defval: "", raw: false });
    // localiza a linha de cabeçalho real (arquivos da B3 podem ter preâmbulo)
    let idx = -1;
    for (let i = 0; i < Math.min(matriz.length, 15); i++) {
      const celulas = (matriz[i] ?? []).map((c) => String(c ?? "").trim()).filter(Boolean);
      if (celulas.length >= 3 && celulas.some((c) => /[a-zA-Zç]/.test(c))) {
        const { layout } = detectarLayout(celulas);
        if (layout !== "desconhecido" || celulas.length >= 5) {
          idx = i;
          break;
        }
      }
    }
    if (idx === -1) continue;
    const cabecalhos = (matriz[idx] ?? []).map((c) => String(c ?? "").trim());
    const linhas: Record<string, unknown>[] = [];
    for (let i = idx + 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => String(c ?? "").trim() !== "")) continue;
      const obj: Record<string, unknown> = { __linha: i + 1 };
      cabecalhos.forEach((h, j) => {
        if (h) obj[h] = bruta[j] ?? "";
      });
      linhas.push(obj);
    }
    abas.push({ nome, cabecalhos, linhas });
  }
  return abas;
}

export async function lerArquivoB3(arquivo: File): Promise<ResultadoB3> {
  const abas = await lerAbas(arquivo);
  const diagnosticos: DiagnosticoB3[] = [];

  if (!abas.length) {
    return {
      aportes: [],
      dividendos: [],
      vendas: 0,
      ignoradas: 0,
      layout: "desconhecido",
      layoutRotulo: "Layout não identificado",
      abas: [],
      totalLinhas: 0,
      mapeamento: [],
      diagnosticos: [
        {
          severidade: "erro",
          titulo: "Nenhuma tabela encontrada",
          detalhe:
            "Não localizamos uma linha de cabeçalho no arquivo. Reexporte o extrato da Área do Investidor da B3 sem editar a planilha.",
        },
      ],
      podeImportar: false,
    };
  }

  const cabecalhosGerais = Array.from(new Set(abas.flatMap((a) => a.cabecalhos))).filter(Boolean);
  const { layout, rotulo } = detectarLayout(cabecalhosGerais);

  const mapeamento: MapeamentoCampo[] = Object.entries(CAMPOS).map(([campo, sinonimos]) => ({
    campo,
    coluna: acharColuna(cabecalhosGerais, sinonimos),
    obrigatorio: OBRIGATORIOS.includes(campo),
  }));
  const col = (campo: string) => mapeamento.find((m) => m.campo === campo)?.coluna ?? null;
  const valorDe = (linha: Record<string, unknown>, campo: string): string => {
    const c = col(campo);
    if (!c) return "";
    const v = linha[c];
    return v === undefined || v === null ? "" : String(v).trim();
  };

  if (layout === "desconhecido") {
    diagnosticos.push({
      severidade: "aviso",
      titulo: "Layout não reconhecido",
      detalhe:
        "Não identificamos o tipo de extrato. Vamos tentar interpretar as colunas automaticamente — confira a prévia antes de importar.",
    });
  } else {
    diagnosticos.push({
      severidade: "info",
      titulo: `Layout detectado: ${rotulo}`,
      detalhe: `${abas.length} aba(s) lida(s): ${abas.map((a) => a.nome).join(", ")}.`,
    });
  }
  if (layout === "posicao") {
    diagnosticos.push({
      severidade: "aviso",
      titulo: "Relatório de posição",
      detalhe:
        "Esse relatório mostra a foto da carteira, sem histórico de compras. Para importar aportes, exporte o Extrato de Negociação.",
    });
  }

  for (const m of mapeamento.filter((m) => m.obrigatorio && !m.coluna)) {
    diagnosticos.push({
      severidade: "erro",
      titulo: `Coluna obrigatória ausente: ${m.campo}`,
      detalhe: `Não encontramos nenhuma coluna equivalente a "${CAMPOS[m.campo][0]}" no arquivo.`,
    });
  }
  if (!col("quantidade") || (!col("preco") && !col("valor"))) {
    diagnosticos.push({
      severidade: "aviso",
      titulo: "Colunas de valor incompletas",
      detalhe:
        "Sem Quantidade e Preço (ou Valor da Operação) não conseguimos calcular aportes — apenas proventos serão importados.",
    });
  }

  const aportes: AporteB3[] = [];
  const dividendos: DividendoB3[] = [];
  let vendas = 0;
  let ignoradas = 0;
  let totalLinhas = 0;
  const linhasSemData: number[] = [];
  const linhasSemTicker: number[] = [];
  const linhasSemValor: number[] = [];
  const tickersEstranhos = new Set<string>();
  const chavesVistas = new Set<string>();
  const duplicadas: number[] = [];
  const hoje = new Date().toISOString().slice(0, 10);
  const futuras: number[] = [];

  for (const aba of abas) {
    for (const linha of aba.linhas) {
      totalLinhas++;
      const nLinha = Number(linha.__linha ?? 0);
      const produto = valorDe(linha, "ticker");
      const ticker = extrairTicker(produto);
      const dataBruta = valorDe(linha, "data");
      const data = dataBruta ? dataISO(dataBruta) : null;
      const instituicao = valorDe(linha, "instituicao") || "B3";

      if (!ticker) {
        linhasSemTicker.push(nLinha);
        ignoradas++;
        continue;
      }
      if (!tickerValido(ticker)) tickersEstranhos.add(ticker);
      if (!data) {
        linhasSemData.push(nLinha);
        ignoradas++;
        continue;
      }
      if (data > hoje) futuras.push(nLinha);

      const movimento = semAcento(valorDe(linha, "movimento"));

      if (TIPOS_PROVENTO.some((t) => movimento.includes(t))) {
        const valor = numeroBR(valorDe(linha, "valor")) || numeroBR(valorDe(linha, "preco"));
        if (valor > 0) {
          dividendos.push({
            data,
            ticker,
            tipo: movimento.includes("juros") || movimento.includes("jcp")
              ? "JCP"
              : movimento.includes("rendimento")
                ? "Rendimento"
                : "Dividendo",
            valor,
          });
        } else {
          linhasSemValor.push(nLinha);
          ignoradas++;
        }
        continue;
      }

      const compra =
        movimento.includes("compra") || movimento.includes("credito") || movimento.includes("entrada") || movimento === "c";
      const venda =
        movimento.includes("venda") || movimento.includes("debito") || movimento.includes("saida") || movimento === "v";
      if (venda) {
        vendas++;
        continue;
      }
      if (!compra) {
        ignoradas++;
        continue;
      }

      const quantidade = numeroBR(valorDe(linha, "quantidade"));
      let preco = numeroBR(valorDe(linha, "preco"));
      const valorTotal = numeroBR(valorDe(linha, "valor"));
      if (!preco && quantidade > 0 && valorTotal > 0) preco = valorTotal / quantidade;

      if (quantidade > 0 && preco > 0) {
        const chave = `${data}|${ticker}|${quantidade}|${preco.toFixed(4)}`;
        if (chavesVistas.has(chave)) duplicadas.push(nLinha);
        chavesVistas.add(chave);
        aportes.push({
          data,
          corretora: instituicao,
          ticker,
          categoria: categoriaDoTicker(ticker, valorDe(linha, "mercado")),
          quantidade,
          preco,
          taxas: 0,
          observacoes: "Importado da B3",
        });
      } else {
        linhasSemValor.push(nLinha);
        ignoradas++;
      }
    }
  }

  const aviso = (titulo: string, detalhe: string, linhas: number[]) => {
    if (linhas.length)
      diagnosticos.push({ severidade: "aviso", titulo, detalhe, linhas: linhas.slice(0, 20) });
  };
  aviso(`${linhasSemTicker.length} linha(s) sem ativo`, "Linhas sem código de negociação foram ignoradas.", linhasSemTicker);
  aviso(`${linhasSemData.length} linha(s) com data inválida`, "Não conseguimos interpretar a data dessas linhas.", linhasSemData);
  aviso(
    `${linhasSemValor.length} linha(s) sem quantidade ou preço`,
    "Sem quantidade e preço válidos não é possível gerar o aporte.",
    linhasSemValor,
  );
  aviso(`${duplicadas.length} possível(is) duplicata(s)`, "Mesma data, ativo, quantidade e preço aparecem mais de uma vez.", duplicadas);
  aviso(`${futuras.length} linha(s) com data futura`, "Confira se a data de liquidação está correta.", futuras);
  if (tickersEstranhos.size)
    diagnosticos.push({
      severidade: "aviso",
      titulo: `${tickersEstranhos.size} código(s) fora do padrão B3`,
      detalhe: `Verifique: ${Array.from(tickersEstranhos).slice(0, 10).join(", ")}.`,
    });
  if (vendas)
    diagnosticos.push({
      severidade: "info",
      titulo: `${vendas} venda(s) ignorada(s)`,
      detalhe: "Esta versão importa apenas compras e proventos.",
    });

  const temErro = diagnosticos.some((d) => d.severidade === "erro");
  if (!temErro && !aportes.length && !dividendos.length) {
    diagnosticos.push({
      severidade: "erro",
      titulo: "Nenhuma compra ou provento reconhecido",
      detalhe: `Lemos ${totalLinhas} linha(s), mas nenhuma pôde ser convertida. Confirme que o arquivo é o Extrato de Negociação ou de Movimentação da B3.`,
    });
  }

  aportes.sort((a, b) => a.data.localeCompare(b.data));
  dividendos.sort((a, b) => a.data.localeCompare(b.data));

  return {
    aportes,
    dividendos,
    vendas,
    ignoradas,
    layout,
    layoutRotulo: rotulo,
    abas: abas.map((a) => a.nome),
    totalLinhas,
    mapeamento,
    diagnosticos,
    podeImportar: !diagnosticos.some((d) => d.severidade === "erro") && (aportes.length > 0 || dividendos.length > 0),
  };
}
