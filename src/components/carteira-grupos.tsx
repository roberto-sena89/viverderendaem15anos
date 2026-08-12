import { useCallback, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  Pencil,
  Settings2,
  Trash2,
} from "lucide-react";

import { TickerMark } from "@/components/panel";
import { DialogTransacao } from "@/components/dialog-transacao";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { useSubAlocacaoAlvo } from "@/lib/subalocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { chaveTicker, useCotacoesTempoReal } from "@/lib/cotacoes-tempo-real";
import { chaveBrapi, usePrecosBrapiCarteira } from "@/lib/carteira-brapi";
import { chavePreco, usePersistirPrecos, useUltimosPrecosSalvos } from "@/lib/precos-ultimos";

import {
  brl,
  classeDoAtivo,
  pct,
  valorAtual,
  valorInvestido,
  CLASSE_POS_FIXADO,
  type Ativo,
} from "@/lib/portfolio";
import { useSalvarAtivo } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { formatarNumeroBR, numeroBR } from "@/lib/formato-numero";
import { toast } from "sonner";
import { EstadoVazio } from "@/components/estado-vazio";

type ColunaId =
  | "quantidade"
  | "precoMedio"
  | "precoAtual"
  | "variacaoDia"
  | "variacao"
  | "rentabilidade"
  | "saldo"
  | "participacao"
  | "ideal"
  | "comprar";

const PADRAO: Record<ColunaId, boolean> = {
  quantidade: true,
  precoMedio: true,
  precoAtual: true,
  variacaoDia: true,
  variacao: true,
  rentabilidade: true,
  saldo: true,
  participacao: true,
  ideal: true,
  comprar: true,
};

/** Hora local (HH:mm:ss) da última cotação recebida do provedor. */
const horaCotacao = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

interface Grupo {
  classe: string;
  ativos: Ativo[];
  total: number;
  investido: number;
  rentabilidade: number;
  variacao: number;
  participacao: number;
  ideal: number;
  /** Soma das variações (%) dos ativos do grupo. */
  variacaoPct: number;
  /** Variação do dia (%) ponderada pelo saldo, vinda das cotações ao vivo. */
  variacaoDiaPct: number | null;
}

const num = (v: number, d = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Converte valores possivelmente nulos/strings vindos da API em número finito. */
function numeroSeguro(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const limpo = v
      .replace(/\s|R\$/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number(limpo);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Variação percentual de um ativo, tolerante a dados ausentes ou em texto. */
function variacaoAtivo(a: Ativo): number {
  const medio = numeroSeguro(a.precoMedio);
  const atual = numeroSeguro(a.precoAtual);
  if (medio <= 0) return 0;
  return ((atual - medio) / medio) * 100;
}

/**
 * Exibe um valor com sinal explícito (+/-) e arredondamento consistente (2 casas).
 * O sinal é definido a partir do valor JÁ arredondado, evitando "-0,00".
 */
function Variacao({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const arredondado = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  const seguro = Object.is(arredondado, -0) ? 0 : arredondado;
  const cor =
    seguro > 0 ? "text-success" : seguro < 0 ? "text-destructive" : "text-muted-foreground";
  const sinal = seguro > 0 ? "+" : seguro < 0 ? "−" : "";
  const corpo = suffix === "%" ? `${num(Math.abs(seguro))}%` : brl(Math.abs(seguro), 2);
  return (
    <span className={`font-semibold tabular-nums ${cor}`}>
      {sinal}
      {corpo}
    </span>
  );
}

export function CarteiraGrupos({
  ativos: ativosBase,
  onEditar,
  onExcluir,
  minimal = false,
}: {
  ativos: Ativo[];
  onEditar?: (a: Ativo) => void;
  onExcluir?: (a: Ativo) => void;
  /** Abre o fluxo de realocação do ativo para outra categoria. */
  /** Modo enxuto: sem barra de ferramentas, densidade compacta e grupos recolhidos. */
  minimal?: boolean;
}) {
  const { alvo } = useAlocacaoAlvo();
  const { subAlvo } = useSubAlocacaoAlvo();
  const { flash, mapa: cotacoes, pregaoAberto } = useCotacoesTempoReal();
  const tickers = useMemo(() => ativosBase.map((a) => a.ticker), [ativosBase]);
  const brapi = usePrecosBrapiCarteira(tickers);
  /** Rede de segurança: último preço válido gravado no banco. */
  const salvos = useUltimosPrecosSalvos(tickers);

  /** O servidor busca e grava o último preço destes tickers (máx. 1x/min). */
  usePersistirPrecos(tickers);

  /** Preços definidos manualmente pelo usuário (têm prioridade sobre as fontes). */
  const [manuais, setManuais] = useState<Record<string, number>>({});
  /** Ticker cuja célula "P. atual" está em edição. */
  const [editando, setEditando] = useState<string | null>(null);
  const salvarAtivo = useSalvarAtivo();

  /** Variação do dia: prioriza o provedor em tempo real, com fallback na BRAPI. */
  const variacaoDiaDe = useCallback(
    (ticker: string): number | null =>
      cotacoes.get(chaveTicker(ticker))?.variacaoPercent ??
      brapi.get(chaveBrapi(ticker))?.variacaoPercent ??
      salvos.get(chavePreco(ticker))?.variacaoPercent ??
      null,
    [cotacoes, brapi, salvos],
  );

  /**
   * Preço atual do ativo: valor definido manualmente vem primeiro; depois BRAPI
   * (tempo real no pregão, último preço antes do fechamento fora dele); se ela
   * não tiver o ativo, a cotação da aba "Cotações"; e, por fim, o último preço
   * válido salvo no banco.
   */
  const precoDe = useCallback(
    (ticker: string) =>
      manuais[chavePreco(ticker)] ??
      brapi.get(chaveBrapi(ticker))?.preco ??
      cotacoes.get(chaveTicker(ticker))?.preco ??
      salvos.get(chavePreco(ticker))?.preco ??
      null,
    [manuais, brapi, cotacoes, salvos],
  );

  /** Origem do preço exibido, usada no tooltip da coluna "P. atual". */
  const fonteDe = (ticker: string) => {
    if (manuais[chavePreco(ticker)] !== undefined)
      return "Preço informado manualmente · clique duas vezes para editar";
    const b = brapi.get(chaveBrapi(ticker));
    if (b) {
      const hora = horaCotacao(b.atualizadoEm ?? undefined);
      const rotulo = pregaoAberto ? "BRAPI · tempo real" : "BRAPI · fechamento do último pregão";
      return hora ? `${rotulo} · ${hora}` : rotulo;
    }
    const c = cotacoes.get(chaveTicker(ticker));
    if (c) {
      const hora = horaCotacao(c.atualizadoEm);
      return `Cotações: ${c.fonte}${hora ? ` · ${hora}` : ""}${c.erro ? ` · ${c.erro}` : ""}`;
    }
    const s = salvos.get(chavePreco(ticker));
    if (s) {
      const hora = horaCotacao(s.atualizadoEm);
      return `Último preço salvo (${s.fonte})${hora ? ` · ${hora}` : ""}`;
    }
    return "Aguardando cotação do provedor de mercado";
  };

  /** Grava o preço informado manualmente (mantido também no cadastro do ativo). */
  async function definirPrecoManual(a: Ativo, texto: string) {
    setEditando(null);
    const valor = numeroBR(texto);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um preço maior que zero.");
      return;
    }
    setManuais((m) => ({ ...m, [chavePreco(a.ticker)]: valor }));
    try {
      await salvarAtivo.mutateAsync({
        id: a.id,
        ticker: a.ticker,
        nome: a.nome,
        categoria: a.categoria,
        quantidade: a.quantidade,
        precoMedio: a.precoMedio,
        precoAtual: valor,
        dy: a.dy,
      });
      toast.success(`${a.ticker}: preço atualizado para ${brl(valor, 2)}.`);
    } catch {
      toast.error("Não foi possível salvar o preço.");
    }
  }

  /** Volta a seguir as cotações automáticas do ativo. */
  function voltarAoAutomatico(ticker: string) {
    setManuais((m) => {
      const { [chavePreco(ticker)]: _removido, ...resto } = m;
      return resto;
    });
    toast.success(`${ticker}: preço voltou a sincronizar automaticamente.`);
  }

  /** Ativos com o preço atual sincronizado com a cotação de mercado. */
  const ativos = useMemo(
    () =>
      ativosBase.map((a) => {
        const preco = precoDe(a.ticker);
        return preco && preco > 0 ? { ...a, precoAtual: preco } : a;
      }),
    [ativosBase, precoDe],
  );

  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const colunas = PADRAO;
  const compacto = minimal;
  const cel = compacto ? "py-1.5 text-xs" : "";
  /** Colunas secundárias somem em telas menores para eliminar a rolagem horizontal. */
  const colMd = "hidden md:table-cell";
  const colLg = "hidden lg:table-cell";
  /** Colunas secundárias: escondidas no celular para a grade não estourar. */
  const colSm = "hidden sm:table-cell";

  const { grupos, totalCarteira } = useMemo(() => {
    const totalCarteira = ativos.reduce((s, a) => s + valorAtual(a), 0);
    const mapa = new Map<string, Ativo[]>();
    for (const a of ativos) {
      const classe = classeDoAtivo(a);
      mapa.set(classe, [...(mapa.get(classe) ?? []), a]);
    }
    const grupos: Grupo[] = [...mapa.entries()]
      .map(([classe, lista]) => {
        const total = lista.reduce((s, a) => s + valorAtual(a), 0);
        const investido = lista.reduce((s, a) => s + valorInvestido(a), 0);
        const somaVariacoes = lista.reduce((s, a) => s + variacaoAtivo(a), 0);
        // Variação do dia ponderada pelo saldo, a partir das cotações ao vivo.
        let pesoDia = 0;
        let somaDia = 0;
        for (const a of lista) {
          const v = variacaoDiaDe(a.ticker);
          if (v === null || v === undefined) continue;
          const peso = valorAtual(a);
          pesoDia += peso;
          somaDia += v * peso;
        }
        // Soma os mesmos valores arredondados exibidos em cada linha da tabela,
        // garantindo que o cabeçalho nunca divirja das linhas visíveis.
        const rentabilidadeReais = lista.reduce(
          (s, a) => s + Math.round((valorAtual(a) - valorInvestido(a)) * 100) / 100,
          0,
        );
        return {
          variacaoPct: somaVariacoes,
          variacaoDiaPct: pesoDia > 0 ? somaDia / pesoDia : null,
          classe,
          ativos: [...lista].sort((x, y) => valorAtual(y) - valorAtual(x)),
          total,
          investido,
          rentabilidade: investido > 0 ? ((total - investido) / investido) * 100 : 0,
          variacao: rentabilidadeReais,

          participacao: totalCarteira > 0 ? (total / totalCarteira) * 100 : 0,
          ideal: alvo[classe] ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);
    return { grupos, totalCarteira };
  }, [ativos, alvo, variacaoDiaDe]);

  if (grupos.length === 0) {
    return (
      <EstadoVazio
        className="surface-card"
        titulo="Sua carteira está vazia"
        descricao="Nenhum ativo cadastrado ainda. Registre um lançamento para começar a acompanhar sua carteira."
      />
    );
  }

  return (
    <div className={compacto ? "space-y-2" : "space-y-4"}>
      {grupos.map((g) => {
        const aberto = fechados[g.classe] === undefined ? !minimal : !fechados[g.classe];
        const cor = corClasse(g.classe);
        const idealAtivo = g.ativos.length > 0 ? g.ideal / g.ativos.length : 0;
        // Dentro da Renda Fixa, o "% Ideal" vem das sub-classes definidas em
        // "Editar alocação ideal" (Tesouro SELIC, IPCA+, Prefixado, CDB),
        // dividido entre os ativos de cada sub-classe.
        const contagemSub = new Map<string, number>();
        if (g.classe === CLASSE_POS_FIXADO) {
          for (const a of g.ativos) {
            const sub = subclasseRendaFixa(a);
            if (sub) contagemSub.set(sub, (contagemSub.get(sub) ?? 0) + 1);
          }
        }
        const idealDe = (a: Ativo) => {
          if (g.classe !== CLASSE_POS_FIXADO) return idealAtivo;
          const sub = subclasseRendaFixa(a);
          const n = sub ? (contagemSub.get(sub) ?? 0) : 0;
          if (!sub || n === 0) return idealAtivo;
          return (subAlvo[sub] ?? 0) / n;
        };
        return (
          <section key={g.classe} className="surface-card overflow-hidden">
            {minimal ? (
              <header
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-3 py-2.5 sm:px-4"
                style={{
                  borderColor: cor,
                  backgroundColor: `color-mix(in oklab, ${cor} 8%, transparent)`,
                }}
              >
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => setFechados((f) => ({ ...f, [g.classe]: aberto }))}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
                    style={{ color: cor }}
                  />
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold whitespace-pre-line sm:whitespace-normal">
                      {g.classe.replace(/\n/g, " · ")}
                    </span>
                    <span className="block text-[0.82rem] text-muted-foreground">
                      {g.ativos.length} {g.ativos.length === 1 ? "ativo" : "ativos"} ·{" "}
                      <span className="font-semibold tabular-nums" style={{ color: cor }}>
                        {pct(g.participacao)}
                      </span>{" "}
                      de <span className="tabular-nums">{pct(g.ideal)}</span>
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-semibold tabular-nums">{brl(g.total, 2)}</span>
                  <span className="text-xs">
                    <Variacao value={g.rentabilidade} />
                  </span>
                </div>
              </header>
            ) : (
              <header
                className={`relative border-l-4 ${compacto ? "px-4 py-3" : "px-4 py-4 sm:px-5"}`}
                style={{ borderColor: cor }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-label={`${aberto ? "Recolher" : "Expandir"} ${g.classe.replace(/\n/g, " ")}`}
                    onClick={() => setFechados((f) => ({ ...f, [g.classe]: aberto }))}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span
                      className={`grid shrink-0 place-items-center rounded-xl ${compacto ? "size-8" : "size-10"}`}
                      style={{
                        backgroundColor: `color-mix(in oklab, ${cor} 16%, transparent)`,
                        color: cor,
                      }}
                    >
                      <BarChart3 className={compacto ? "size-4" : "size-5"} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate font-display leading-tight font-bold ${compacto ? "text-sm" : "text-base lg:text-lg"}`}
                      >
                        {g.classe.replace(/\n/g, " ").split("(")[0].trim()}
                      </span>
                      {g.classe.includes("(") ? (
                        <span className="mt-0.5 block truncate text-[0.78rem] leading-snug text-muted-foreground">
                          {g.classe
                            .replace(/\n/g, " ")
                            .slice(g.classe.replace(/\n/g, " ").indexOf("(") + 1)
                            .replace(/\)/g, "")
                            .replace(/,\s*/g, ", ")
                            .trim()}
                        </span>
                      ) : null}
                    </span>
                    {/* Indicador: colado ao título no celular, centralizado a partir de sm. */}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 shrink-0 text-muted-foreground transition-transform lg:hidden ${aberto ? "rotate-180" : ""}`}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 lg:block"
                    >
                      <ChevronDown
                        className={`size-5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  <div className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="text-sm font-bold tabular-nums sm:text-base lg:text-lg">
                      {brl(g.total, 2)}
                    </span>
                    <span className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Saldo atual
                    </span>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Ativos
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">{g.ativos.length}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Investido
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">{brl(g.investido, 2)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Var. dia
                    </dt>
                    <dd className="text-sm">
                      {g.variacaoDiaPct === null ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Variacao value={g.variacaoDiaPct} />
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Variação (%)
                    </dt>
                    <dd className="text-sm">
                      <Variacao value={g.variacaoPct} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Rentabilidade
                    </dt>
                    <dd className="text-sm">
                      <Variacao value={g.variacao} suffix="" />
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      % na carteira
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">
                      {pct(g.participacao)}{" "}
                      <span className="text-muted-foreground">/ {pct(g.ideal)}</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(2, Math.min(100, g.ideal > 0 ? (g.participacao / g.ideal) * 100 : g.participacao))}%`,
                      backgroundColor: cor,
                    }}
                  />
                </div>
              </header>
            )}

            {aberto ? (
              <>
                {/* Mobile: cartões por ativo (evita estouro da grade). */}
                <ul className="grid gap-2 border-t p-2 md:hidden">
                  {g.ativos.map((a) => {
                    const saldo = valorAtual(a);
                    const variacao = variacaoAtivo(a);
                    const participacao = totalCarteira > 0 ? (saldo / totalCarteira) * 100 : 0;
                    const idealLinha = idealDe(a);
                    const varDia = variacaoDiaDe(a.ticker);
                    return (
                      <li key={a.id} className="rounded-xl border bg-card p-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm leading-tight font-bold">
                              {a.ticker}
                            </p>
                            <p
                              className="truncate text-[0.7rem] text-muted-foreground"
                              title={a.nome || a.categoria}
                            >
                              {a.nome || a.categoria}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <div className="text-right leading-tight">
                              <p className="text-sm font-bold tabular-nums">{brl(saldo, 2)}</p>
                              <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                                Saldo
                              </p>
                            </div>
                            {onEditar && onExcluir ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label={`Ações de ${a.ticker}`}
                                    className="h-7 gap-1 rounded-md px-1.5 text-[0.7rem] leading-none font-semibold"
                                  >
                                    <Settings2 className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                                    {a.ticker}
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => onEditar?.(a)}>
                                    <Pencil className="size-4" /> Editar ativo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setEditando(a.id)}>
                                    <Pencil className="size-4" /> Editar preço atual
                                  </DropdownMenuItem>
                                  {manuais[chavePreco(a.ticker)] !== undefined && (
                                    <DropdownMenuItem onSelect={() => voltarAoAutomatico(a.ticker)}>
                                      <CircleCheck className="size-4" /> Voltar preço automático
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => onExcluir?.(a)}
                                  >
                                    <Trash2 className="size-4" /> Excluir ativo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </div>

                        <dl className="mt-2.5 grid grid-cols-3 gap-x-2 gap-y-2 border-t pt-2.5">
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              P. atual
                            </dt>
                            <dd className="text-[0.8rem] font-semibold tabular-nums">
                              {editando === a.id ? (
                                <Input
                                  autoFocus
                                  inputMode="decimal"
                                  aria-label={`Preço atual de ${a.ticker}`}
                                  defaultValue={formatarNumeroBR(a.precoAtual)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onBlur={(e) => void definirPrecoManual(a, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    if (e.key === "Escape") setEditando(null);
                                  }}
                                  className="h-7 w-full text-right tabular-nums"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditando(a.id)}
                                  className="inline-flex items-center gap-1 rounded hover:bg-muted"
                                >
                                  {manuais[chavePreco(a.ticker)] !== undefined && (
                                    <Pencil className="size-3 text-muted-foreground" />
                                  )}
                                  {brl(a.precoAtual, 2)}
                                </button>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              Var. dia
                            </dt>
                            <dd className="text-[0.8rem]">
                              {varDia != null ? (
                                <Variacao value={varDia} />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              Rent.
                            </dt>
                            <dd className="text-[0.8rem]">
                              <Variacao value={variacao} />
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              Quant.
                            </dt>
                            <dd className="text-[0.8rem] tabular-nums">{num(a.quantidade)}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              P. médio
                            </dt>
                            <dd className="text-[0.8rem] tabular-nums">{brl(a.precoMedio, 2)}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              % Cart. / Ideal
                            </dt>
                            <dd className="text-[0.8rem] tabular-nums">
                              <span
                                className={
                                  participacao >= idealLinha ? "text-success" : "text-destructive"
                                }
                              >
                                {pct(participacao)}
                              </span>{" "}
                              <span className="text-muted-foreground">/ {pct(idealLinha)}</span>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>

                <div className="hidden border-t md:block">
                  <Table
                    wrapperClassName="w-full max-w-full overflow-x-auto overscroll-x-contain scrollbar-none"
                    className="w-full min-w-0 table-fixed text-[0.8rem] sm:text-sm [&_th]:px-1.5 [&_td]:px-1.5 sm:[&_th]:px-3 sm:[&_td]:px-3 [&_th]:leading-tight [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th]:font-semibold [&_th]:tracking-wide [&_th]:uppercase"
                  >
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        {/* Coluna elástica: absorve todo o espaço livre para as colunas numéricas ficarem coladas à direita. */}
                        <TableHead className="w-full min-w-[6.5rem] sm:min-w-[9rem]">
                          Ticker / Ativo
                        </TableHead>

                        {colunas.quantidade && (
                          <TableHead className={`w-[4rem] text-right sm:w-[5.5rem] ${colSm}`}>
                            Quant.
                          </TableHead>
                        )}
                        {colunas.precoMedio && (
                          <TableHead className={`w-[5rem] text-right sm:w-[6rem] ${colMd}`}>
                            P. médio
                          </TableHead>
                        )}
                        {colunas.precoAtual && (
                          <TableHead className="w-[5rem] text-right sm:w-[6.5rem]">
                            P. atual
                          </TableHead>
                        )}
                        {colunas.variacaoDia && (
                          <TableHead
                            className={`w-[4.5rem] text-right sm:w-[5rem] ${colSm}`}
                            title="Variação do dia vinda das cotações ao vivo"
                          >
                            Var. dia
                          </TableHead>
                        )}
                        {colunas.variacao && (
                          <TableHead className={`w-[4rem] text-right sm:w-[4.5rem] ${colLg}`}>
                            Var. (%)
                          </TableHead>
                        )}
                        {colunas.rentabilidade && (
                          <TableHead className={`w-[5.5rem] text-right sm:w-[6.5rem] ${colMd}`}>
                            Rent. (R$)
                          </TableHead>
                        )}
                        {colunas.saldo && (
                          <TableHead className="w-[5.5rem] text-right sm:w-[7rem]">
                            Saldo
                          </TableHead>
                        )}
                        {colunas.participacao && (
                          <TableHead className={`w-[4rem] text-right sm:w-[4.5rem] ${colSm}`}>
                            % Cart.
                          </TableHead>
                        )}
                        {colunas.ideal && (
                          <TableHead className={`w-[4rem] text-right sm:w-[4.5rem] ${colLg}`}>
                            % Ideal
                          </TableHead>
                        )}
                        {colunas.comprar && (
                          <TableHead className={`w-[4rem] text-center sm:w-[4.5rem] ${colLg}`}>
                            Comp.
                          </TableHead>
                        )}

                        {onEditar && onExcluir ? (
                          <TableHead className="w-[4rem] pr-2 text-center sm:w-[5rem] sm:pr-3">Ação</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {g.ativos.map((a) => {
                        const live = cotacoes.get(chaveTicker(a.ticker));
                        const saldo = valorAtual(a);
                        const investido = valorInvestido(a);
                        const variacao = variacaoAtivo(a);
                        const participacao = totalCarteira > 0 ? (saldo / totalCarteira) * 100 : 0;
                        const idealLinha = idealDe(a);
                        const comprar = participacao < idealLinha;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className={cel}>
                              <div
                                className={`flex min-w-0 items-center ${compacto ? "gap-2" : "gap-2 sm:gap-3"}`}
                              >
                                {compacto ? null : (
                                  <span className="hidden shrink-0 sm:inline-flex">
                                    <TickerMark ticker={a.ticker} />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-display leading-tight font-bold">
                                    {a.ticker}
                                  </p>
                                  <p
                                    className={`truncate text-[0.7rem] text-muted-foreground sm:text-xs ${compacto ? "max-w-32 sm:max-w-40" : "max-w-36 sm:max-w-56"}`}
                                    title={a.nome || a.categoria}
                                  >
                                    {a.nome || a.categoria}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            {colunas.quantidade && (
                              <TableCell className={`text-right tabular-nums ${colSm} ${cel}`}>
                                {num(a.quantidade)}
                              </TableCell>
                            )}
                            {colunas.precoMedio && (
                              <TableCell className={`text-right tabular-nums ${colMd} ${cel}`}>
                                {brl(a.precoMedio, 2)}
                              </TableCell>
                            )}
                            {colunas.precoAtual && (
                              <TableCell
                                className={`text-right font-semibold tabular-nums ${cel} ${
                                  editando === a.id
                                    ? ""
                                    : flash[chaveTicker(a.ticker)] === "alta"
                                      ? "flash-alta"
                                      : flash[chaveTicker(a.ticker)] === "baixa"
                                        ? "flash-baixa"
                                        : ""
                                }`}
                                title={fonteDe(a.ticker)}
                                onDoubleClick={() => setEditando(a.id)}
                              >
                                {editando === a.id ? (
                                  <Input
                                    autoFocus
                                    inputMode="decimal"
                                    aria-label={`Preço atual de ${a.ticker}`}
                                    defaultValue={formatarNumeroBR(a.precoAtual)}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onBlur={(e) => void definirPrecoManual(a, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                      if (e.key === "Escape") setEditando(null);
                                    }}
                                    className="h-8 w-24 text-right tabular-nums"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditando(a.id)}
                                    className="inline-flex items-center gap-1 rounded px-1 hover:bg-muted"
                                  >
                                    {manuais[chavePreco(a.ticker)] !== undefined && (
                                      <Pencil className="size-3 text-muted-foreground" />
                                    )}
                                    {brl(a.precoAtual, 2)}
                                  </button>
                                )}
                              </TableCell>
                            )}

                            {colunas.variacaoDia && (
                              <TableCell
                                className={`text-right ${colSm} ${cel} ${
                                  flash[chaveTicker(a.ticker)] === "alta"
                                    ? "flash-alta"
                                    : flash[chaveTicker(a.ticker)] === "baixa"
                                      ? "flash-baixa"
                                      : ""
                                }`}
                                title={
                                  live
                                    ? `Variação do dia · ${live.fonte}`
                                    : "Aguardando cotação do provedor de mercado"
                                }
                              >
                                {variacaoDiaDe(a.ticker) != null ? (
                                  <Variacao value={variacaoDiaDe(a.ticker) as number} />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )}
                            {colunas.variacao && (
                              <TableCell className={`text-right ${colLg} ${cel}`}>
                                <Variacao value={variacao} />
                              </TableCell>
                            )}
                            {colunas.rentabilidade && (
                              <TableCell className={`text-right ${colMd} ${cel}`}>
                                <Variacao value={saldo - investido} suffix="" />
                              </TableCell>
                            )}
                            {colunas.saldo && (
                              <TableCell className={`text-right font-semibold tabular-nums ${cel}`}>
                                {brl(saldo, 2)}
                              </TableCell>
                            )}

                            {colunas.participacao && (
                              <TableCell className={`text-right tabular-nums ${colSm} ${cel}`}>
                                {pct(participacao)}
                              </TableCell>
                            )}
                            {colunas.ideal && (
                              <TableCell
                                className={`text-right text-muted-foreground tabular-nums ${colLg} ${cel}`}
                              >
                                {pct(idealLinha)}
                              </TableCell>
                            )}
                            {colunas.comprar && (
                              <TableCell className={`text-center ${colLg} ${cel}`}>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold ${
                                    compacto ? "px-2 py-0.5" : "px-2.5 py-1"
                                  } ${
                                    comprar
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-destructive/40 bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {comprar ? (
                                    <CircleCheck className="size-3.5" />
                                  ) : (
                                    <CircleSlash className="size-3.5" />
                                  )}
                                  {comprar ? "Sim" : "Não"}
                                </span>
                              </TableCell>
                            )}

                            {onEditar && onExcluir ? (
                              <TableCell className={`pr-2 text-center sm:pr-3 ${cel}`}>
                                <div className="flex justify-center gap-1.5">
                                  <DialogTransacao
                                    aporte={{
                                      id: a.id,
                                      ticker: a.ticker,
                                      categoria: a.categoria,
                                      quantidade: a.quantidade,
                                      preco: a.precoMedio,
                                      data: new Date().toISOString().slice(0, 10),
                                      corretora: "",
                                      taxas: 0,
                                    }}
                                  >
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title={`Editar ${a.ticker}`}
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                  </DialogTransacao>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title={`Excluir ${a.ticker}`}
                                    onClick={() => onExcluir?.(a)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 sm:px-6">
                  <p className="text-xs text-muted-foreground">
                    {g.ativos.length} {g.ativos.length === 1 ? "ativo" : "ativos"} ·{" "}
                    {brl(g.total, 2)} ·{" "}
                    {g.participacao >= g.ideal
                      ? "acima ou no alvo desta classe"
                      : `faltam ${pct(g.ideal - g.participacao)} para o alvo`}
                  </p>
                </footer>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** Identifica a sub-classe de Renda Fixa a partir do ticker/nome do ativo. */
function subclasseRendaFixa(a: Ativo): string | null {
  const texto = `${a.ticker ?? ""} ${a.nome ?? ""}`.toLowerCase();
  if (texto.includes("selic")) return "Tesouro SELIC";
  if (texto.includes("ipca")) return "Tesouro IPCA+";
  if (texto.includes("prefix")) return "Tesouro Prefixado";
  if (texto.includes("cdb")) return "CDB";
  return null;
}
