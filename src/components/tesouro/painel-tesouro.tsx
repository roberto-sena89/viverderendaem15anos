import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResumoTesouro, fmtData } from "@/components/tesouro/resumo-tesouro";
import { TabelaTesouro } from "@/components/tesouro/tabela-tesouro";
import { ModalTitulo } from "@/components/tesouro/modal-titulo";
import { EducativoTesouro } from "@/components/tesouro/educativo-tesouro";
import { gradeTesouro } from "@/lib/tesouro.functions";
import {
  INDEXADORES,
  faixaPrazo,
  type IndexadorTitulo,
  type LinhaTesouro,
} from "@/lib/tesouro-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";
import { cn } from "@/lib/utils";
import { SkeletonLinhasGrade } from "@/components/skeleton-grade";

type Ordem = "vencimento" | "maiorTaxa" | "menorPrazo" | "menorMinimo";
type Prazo = "todos" | "curto" | "medio" | "longo";

const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: "vencimento", rotulo: "Vencimento" },
  { id: "maiorTaxa", rotulo: "Maior taxa" },
  { id: "menorPrazo", rotulo: "Menor prazo" },
  { id: "menorMinimo", rotulo: "Menor aplicação" },
];

const PRAZOS: { id: Prazo; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos os prazos" },
  { id: "curto", rotulo: "Até 2 anos" },
  { id: "medio", rotulo: "2 a 10 anos" },
  { id: "longo", rotulo: "Acima de 10 anos" },
];

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

/** Grade completa dos títulos públicos do Tesouro Direto. */
export function PainelTesouro({ busca }: { busca: string }) {
  const buscar = useServerFn(gradeTesouro);
  const { favoritos, alternar } = useFavoritos();
  const { data: ativos } = useAtivos();
  const [indexadores, setIndexadores] = useState<IndexadorTitulo[]>([]);
  const [prazo, setPrazo] = useState<Prazo>("todos");
  const [comCupom, setComCupom] = useState<"todos" | "sim" | "nao">("todos");
  const [ordem, setOrdem] = useState<Ordem>("vencimento");
  const [selecionado, setSelecionado] = useState<LinhaTesouro | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["grade-tesouro"],
    queryFn: () => buscar({ data: { forcar: false } }),
    // O Tesouro publica preços uma vez por dia útil; revalidação leve basta.
    refetchInterval: 15 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
  });

  const linhas = data?.linhas ?? [];

  /** Valor investido pelo usuário em cada título, casando nome e vencimento. */
  const posicoes = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const l of linhas) {
      const ano = l.vencimento.slice(0, 4);
      const total = (ativos ?? [])
        .filter((a) => {
          const texto = normalizar(`${a.ticker} ${a.nome}`);
          if (!texto.includes("TESOURO") && !texto.includes("SELIC") && !texto.includes("IPCA")) {
            return false;
          }
          if (!texto.includes(ano)) return false;
          if (l.indexador === "SELIC") return texto.includes("SELIC");
          if (l.indexador === "IPCA")
            return texto.includes("IPCA") || texto.includes("RENDA") || texto.includes("EDUCA");
          return texto.includes("PREFIX");
        })
        .reduce((s, a) => s + a.quantidade * (a.precoAtual || a.precoMedio), 0);
      if (total > 0) mapa[l.id] = total;
    }
    return mapa;
  }, [linhas, ativos]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = linhas.filter((l) => {
      if (indexadores.length && !indexadores.includes(l.indexador)) return false;
      if (prazo !== "todos" && faixaPrazo(l.anosAteVencimento) !== prazo) return false;
      if (comCupom !== "todos" && l.jurosSemestrais !== (comCupom === "sim")) return false;
      if (!termo) return true;
      return l.nome.toLowerCase().includes(termo) || l.vencimento.includes(termo);
    });

    const por: Record<Ordem, (a: LinhaTesouro, b: LinhaTesouro) => number> = {
      vencimento: (a, b) => a.vencimento.localeCompare(b.vencimento),
      maiorTaxa: (a, b) => (b.taxaCompra ?? -Infinity) - (a.taxaCompra ?? -Infinity),
      menorPrazo: (a, b) => a.anosAteVencimento - b.anosAteVencimento,
      menorMinimo: (a, b) =>
        (a.investimentoMinimo ?? Infinity) - (b.investimentoMinimo ?? Infinity),
    };
    return [...lista].sort(por[ordem]);
  }, [linhas, busca, favoritos, indexadores, prazo, comCupom, ordem]);

  const alternarIndexador = (id: IndexadorTitulo) =>
    setIndexadores((atual) =>
      atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id],
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pilha-secao">
        <ResumoTesouro dados={data} />

        {/* Filtros em chips, sem barras de rolagem */}
        <div className="flex flex-wrap items-center gap-1.5">
          {INDEXADORES.map((i) => (
            <Chip
              key={i.id}
              ativo={indexadores.includes(i.id)}
              onClick={() => alternarIndexador(i.id)}
            >
              {i.rotulo}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          {PRAZOS.map((p) => (
            <Chip key={p.id} ativo={prazo === p.id} onClick={() => setPrazo(p.id)}>
              {p.rotulo}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Chip
            ativo={comCupom === "sim"}
            onClick={() => setComCupom(comCupom === "sim" ? "todos" : "sim")}
          >
            Com juros semestrais
          </Chip>
          <Chip
            ativo={comCupom === "nao"}
            onClick={() => setComCupom(comCupom === "nao" ? "todos" : "nao")}
          >
            Sem cupom
          </Chip>

          <div className="ml-auto flex items-center gap-1.5">
            {ORDENS.map((o) => (
              <Chip key={o.id} ativo={ordem === o.id} onClick={() => setOrdem(o.id)}>
                {o.rotulo}
              </Chip>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar títulos"
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <SkeletonLinhasGrade quantidade={8} colunas={4} />
        ) : (
          <TabelaTesouro
            linhas={filtradas}
            favoritos={favoritos}
            aoFavoritar={(id) => alternar(`TD:${id}`)}
            aoAbrir={setSelecionado}
            posicoes={posicoes}
          />
        )}

        <p className="t-caption">
          {filtradas.length} de {linhas.length} títulos · preços de {fmtData(data?.precosDe)} ·
          fonte: Tesouro Nacional (Tesouro Transparente) e Banco Central.
        </p>

        <EducativoTesouro />

        <ModalTitulo
          linha={selecionado}
          cdi={data?.selic ?? null}
          posicao={selecionado ? posicoes[selecionado.id] : undefined}
          aberto={!!selecionado}
          aoFechar={() => setSelecionado(null)}
        />
      </div>
    </TooltipProvider>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        ativo
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
