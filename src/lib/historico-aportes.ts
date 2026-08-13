import { precoImplausivel, type AtivoLinha } from "@/lib/auditoria";

export interface LinhaAporteBruta {
  data: string;
  ticker: string;
  quantidade: number;
  preco: number;
}

export interface LinhaAportePorMes {
  mes: string;
  total_aportado: number;
}

export interface LinhaAportePorAtivo {
  ticker: string;
  total_aportado: number;
  quantidade_atual: number;
  investido_atual: number;
  valor_atual: number;
  /** Verdadeiro quando o preço atual do ativo parece inconsistente com o preço médio. */
  possivel_inconsistencia: boolean;
}

export interface HistoricoAportesReconciliado {
  /** Soma de compras (quantidade positiva) do histórico. */
  total_aportado_compras: number;
  /** Soma de vendas (quantidade negativa) do histórico. */
  total_vendido: number;
  /** Fluxo líquido registrado: compras − vendas. */
  total_aportado_liquido: number;
  /** Valor de custo hoje, da janela Carteira: Σ quantidade × preço médio. */
  total_investido_carteira: number;
  /** Patrimônio atual da janela Carteira: Σ quantidade × preço atual. */
  patrimonio_atual_carteira: number;
  /** total_aportado_liquido − total_investido_carteira (0 = conciliado). */
  diferenca_conciliacao: number;
  nota_conciliacao: string;
  numero_aportes: number;
  media_mensal: number;
  meses_com_aporte: number;
  primeiro_aporte: string | null;
  ultimo_aporte: string | null;
  por_mes: LinhaAportePorMes[];
  por_ativo: LinhaAportePorAtivo[];
  /** Avisos de ativos cujo preço atual parece inconsistente com o preço médio. */
  alertas_consistencia: string[];
}

/**
 * Reconciliation entre o histórico de aportes (transações) e a carteira atual
 * (posições consolidadas). Diferenças são esperadas quando há vendas parciais,
 * taxas não lançadas ou preço médio ajustado — a nota explica ao assistente qual
 * número usar como referência do valor alocado HOJE.
 */
export function reconciliarHistoricoAportes(
  aportes: LinhaAporteBruta[],
  ativos: AtivoLinha[],
  desde?: string,
): HistoricoAportesReconciliado {
  const ordenados = [...aportes]
    .filter((a) => (desde ? a.data >= desde : true))
    .sort((x, y) => x.data.localeCompare(y.data));

  const porMes = new Map<string, number>();
  const porTicker = new Map<string, number>();
  let compras = 0;
  let vendas = 0;

  for (const l of ordenados) {
    const ticker = l.ticker.toUpperCase();
    const valor = l.quantidade * l.preco;
    porMes.set(l.data.slice(0, 7), (porMes.get(l.data.slice(0, 7)) ?? 0) + valor);
    porTicker.set(ticker, (porTicker.get(ticker) ?? 0) + valor);
    if (l.quantidade >= 0) compras += valor;
    else vendas += Math.abs(valor);
  }

  const totalAportado = compras - vendas;
  const totalInvestidoCarteira = ativos.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
  const patrimonioAtual = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const liquidoArredondado = Math.round(totalAportado);
  const investidoArredondado = Math.round(totalInvestidoCarteira);
  const diferenca = liquidoArredondado - investidoArredondado;

  const notaConciliacao = desde
    ? `Período parcial (desde ${desde}): os totais do histórico NÃO incluem aportes anteriores. Compare sempre com total_investido_carteira, que reflete a carteira inteira de hoje.`
    : Math.abs(diferenca) <= 1
      ? "Conciliado: o total aportado (histórico) equivale ao total investido na carteira atual. Use qualquer um dos dois como referência do valor alocado."
      : "O total aportado no histórico difere do total investido na carteira atual — causa usual: vendas parciais, taxas não lançadas ou preço médio ajustado manualmente. Use SEMPRE 'total_investido_carteira' como o valor alocado HOJE na carteira; os totais do histórico descrevem o fluxo acumulado de dinheiro que entrou/saiu.";

  const meses = [...porMes.entries()]
    .map(([mes, valor]) => ({ mes, total_aportado: Math.round(valor) }))
    .sort((x, y) => x.mes.localeCompare(y.mes));

  const posicao = new Map(ativos.map((a) => [a.ticker.toUpperCase(), a]));
  const porAtivo = [...porTicker.entries()]
    .map(([ticker, valor]) => {
      const a = posicao.get(ticker);
      return {
        ticker,
        total_aportado: Math.round(valor),
        quantidade_atual: a?.quantidade ?? 0,
        investido_atual: a ? Math.round(a.quantidade * a.preco_medio) : 0,
        valor_atual: a ? Math.round(a.quantidade * a.preco_atual) : 0,
        possivel_inconsistencia: a ? precoImplausivel(a) : false,
      };
    })
    .sort((x, y) => y.total_aportado - x.total_aportado);

  const alertasConsistencia = ativos
    .filter((a) => precoImplausivel(a))
    .map(
      (a) =>
        `Preço atual de ${a.ticker} (R$ ${a.preco_atual.toFixed(2)}) parece inconsistente com o preço médio (R$ ${a.preco_medio.toFixed(2)}) — confira o preço do ativo na janela Carteira antes de considerar esse valor.`,
    );

  return {
    total_aportado_compras: Math.round(compras),
    total_vendido: Math.round(vendas),
    total_aportado_liquido: liquidoArredondado,
    total_investido_carteira: investidoArredondado,
    patrimonio_atual_carteira: Math.round(patrimonioAtual),
    diferenca_conciliacao: diferenca,
    nota_conciliacao: notaConciliacao,
    numero_aportes: ordenados.length,
    media_mensal: meses.length ? Math.round(totalAportado / meses.length) : 0,
    meses_com_aporte: meses.length,
    primeiro_aporte: ordenados[0]?.data ?? null,
    ultimo_aporte: ordenados[ordenados.length - 1]?.data ?? null,
    por_mes: meses,
    por_ativo: porAtivo,
    alertas_consistencia: alertasConsistencia,
  };
}
