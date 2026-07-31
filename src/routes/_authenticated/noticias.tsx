import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUp,
  BellRing,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FitaIndices } from "@/components/noticias/fita-indices";
import {
  CartaoHero,
  CartaoMedio,
  EsqueletoHero,
  EsqueletoLista,
  EsqueletoMedio,
  ItemFeed,
} from "@/components/noticias/cartoes";
import { ModalNoticia } from "@/components/noticias/modal-noticia";
import {
  AgendaEconomica,
  MaisLidas,
  NoticiasSalvas,
  RadarCarteira,
  TermosDefinicoes,
} from "@/components/noticias/sidebar-noticias";
import { DialogDetalheAtivo } from "@/components/dialog-detalhe-ativo";
import { listarNoticias, type Noticia } from "@/lib/noticias.functions";
import { usePrefsNoticias } from "@/lib/noticias-preferencias";
import { useAtivos } from "@/lib/data";
import {
  notificarPush,
  pedirPermissaoPush,
  permissaoPush,
  registrarAlerta,
} from "@/lib/alertas-historico";

export const Route = createFileRoute("/_authenticated/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias de Mercado · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Manchetes de InfoMoney, Valor, Reuters e Investing.com organizadas por categoria, com radar dos ativos da sua carteira e agenda econômica.",
      },
      { property: "og:title", content: "Notícias de Mercado · Investidor em 15 Anos" },
      {
        property: "og:description",
        content:
          "Feed editorial de notícias financeiras com filtros por tema, radar da carteira e agenda econômica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/noticias" }],
  }),
  component: PaginaNoticias,
});

const CATEGORIAS = [
  "Todas",
  "Mercados",
  "Ações",
  "Renda Fixa",
  "Fundos Imobiliários",
  "Câmbio & Cripto",
  "Economia",
  "Internacional",
  "Empresas",
] as const;

const PAGINA = 12;
const INTERVALO_ATUALIZACAO = 3 * 60 * 1000;

function normalizar(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function PaginaNoticias() {
  const fn = useServerFn(listarNoticias);
  const { prefs, definir, alternarSalva, registrarLeitura, marcarAlertadas, alternarLista } =
    usePrefsNoticias();
  const { data: ativos } = useAtivos();

  const tickersCarteira = useMemo(
    () => new Set((ativos ?? []).map((a) => a.ticker.toUpperCase())),
    [ativos],
  );

  const { data, isPending, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["noticias-feed"],
    queryFn: () => fn({}),
    refetchInterval: INTERVALO_ATUALIZACAO,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  /* ---- atualização suave: nada é reordenado enquanto o usuário lê ---- */
  const [visiveis, setVisiveis] = useState<Noticia[] | null>(null);
  const [novas, setNovas] = useState(0);

  useEffect(() => {
    const itens = data?.itens;
    if (!itens) return;
    if (visiveis === null) {
      setVisiveis(itens);
      return;
    }
    const ids = new Set(visiveis.map((n) => n.id));
    setNovas(itens.filter((n) => !ids.has(n.id)).length);
  }, [data, visiveis]);

  const aplicarNovas = useCallback(() => {
    if (data?.itens) setVisiveis(data.itens);
    setNovas(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [data]);

  /* ---- filtros ---- */
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Todas");
  const [busca, setBusca] = useState("");
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [soCarteira, setSoCarteira] = useState(false);
  const [ordem, setOrdem] = useState<"recentes" | "relevantes">("recentes");
  const [limite, setLimite] = useState(PAGINA);
  const [aberta, setAberta] = useState<Noticia | null>(null);
  const [ativoSelecionado, setAtivoSelecionado] = useState<string | null>(null);

  const todas = visiveis ?? [];

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    let lista = todas;

    if (categoria !== "Todas") {
      lista = lista.filter((n) => n.categoria === categoria);
    } else if (prefs.categorias.length > 0) {
      lista = lista.filter((n) => prefs.categorias.includes(n.categoria));
    }

    if (prefs.fontes.length > 0) lista = lista.filter((n) => prefs.fontes.includes(n.fonte));

    if (soCarteira) {
      lista = lista.filter((n) => n.tickers.some((t) => tickersCarteira.has(t)));
    }

    if (termo) {
      lista = lista.filter((n) =>
        normalizar(`${n.titulo} ${n.resumo} ${n.fonte} ${n.tickers.join(" ")}`).includes(termo),
      );
    }

    return [...lista].sort((a, b) =>
      ordem === "recentes"
        ? new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime()
        : b.relevancia - a.relevancia,
    );
  }, [todas, categoria, busca, soCarteira, ordem, prefs.categorias, prefs.fontes, tickersCarteira]);

  useEffect(() => {
    setLimite(PAGINA);
  }, [categoria, busca, soCarteira, ordem]);

  const [hero, ...resto] = filtradas;
  const destaques = resto.slice(0, 3);
  const feed = resto.slice(3);
  const feedVisivel = feed.slice(0, limite);

  /* ---- scroll infinito ---- */
  const sentinela = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) setLimite((l) => l + PAGINA);
      },
      { rootMargin: "400px" },
    );
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [feed.length]);

  /* ---- radar da carteira + alertas ---- */
  const daCarteira = useMemo(
    () => todas.filter((n) => n.tickers.some((t) => tickersCarteira.has(t))),
    [todas, tickersCarteira],
  );

  useEffect(() => {
    if (!prefs.notificarCarteira || daCarteira.length === 0) return;
    const limiteTempo = Date.now() - 6 * 3_600_000;
    const novasRelevantes = daCarteira.filter(
      (n) => !prefs.alertadas.includes(n.id) && new Date(n.publicadoEm).getTime() > limiteTempo,
    );
    if (novasRelevantes.length === 0) return;

    for (const n of novasRelevantes.slice(0, 3)) {
      const ticker = n.tickers.find((t) => tickersCarteira.has(t)) ?? n.tickers[0];
      const push = notificarPush(`${ticker} nas notícias`, n.titulo);
      registrarAlerta({
        ticker,
        variacaoPercent: 0,
        preco: null,
        limite: 0,
        canais: push ? ["notícias", "push"] : ["notícias"],
        tipo: "noticia",
        titulo: n.titulo,
        url: n.url,
      });
    }
    marcarAlertadas(novasRelevantes.map((n) => n.id));
  }, [prefs.notificarCarteira, prefs.alertadas, daCarteira, tickersCarteira, marcarAlertadas]);

  async function alternarNotificacoes(ativar: boolean) {
    if (ativar && permissaoPush() === "default") await pedirPermissaoPush();
    definir({ notificarCarteira: ativar });
  }

  /* ---- autocomplete da busca ---- */
  const sugestoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (termo.length < 2) return [];
    const conjunto = new Set<string>();
    for (const n of todas) {
      for (const t of n.tickers) if (normalizar(t).includes(termo)) conjunto.add(t);
      if (normalizar(n.categoria).includes(termo)) conjunto.add(n.categoria);
      if (normalizar(n.fonte).includes(termo)) conjunto.add(n.fonte);
      for (const palavra of n.titulo.split(/[\s,.;:()"]+/)) {
        if (palavra.length > 3 && normalizar(palavra).startsWith(termo)) conjunto.add(palavra);
      }
      if (conjunto.size > 30) break;
    }
    return [...conjunto].slice(0, 6);
  }, [busca, todas]);

  /* ---- resumo do dia ---- */
  const resumoDoDia = useMemo(() => {
    if (todas.length === 0) return null;
    const ultimas = todas.slice(0, 6).map((n) => n.titulo.replace(/\s*[–-]\s*[^–-]*$/, ""));
    const temas = [...new Set(todas.slice(0, 20).map((n) => n.categoria))].slice(0, 3);
    return `Nas últimas horas o noticiário girou em torno de ${temas.join(", ").toLowerCase()}. Entre os destaques: ${ultimas
      .slice(0, 3)
      .join("; ")}. Ao todo, ${todas.length} manchetes de ${
      new Set(todas.map((n) => n.fonte)).size
    } veículos foram reunidas nesta página.`;
  }, [todas]);

  const salvasIds = useMemo(() => new Set(prefs.salvas.map((s) => s.id)), [prefs.salvas]);

  const abrir = useCallback(
    (n: Noticia) => {
      setAberta(n);
      registrarLeitura(n.id);
    },
    [registrarLeitura],
  );

  const salvar = useCallback(
    (n: Noticia) =>
      alternarSalva({
        id: n.id,
        titulo: n.titulo,
        url: n.url,
        fonte: n.fonte,
        categoria: n.categoria,
        publicadoEm: n.publicadoEm,
      }),
    [alternarSalva],
  );

  const propsCartao = (n: Noticia) => ({
    noticia: n,
    salva: salvasIds.has(n.id),
    onAbrir: abrir,
    onSalvar: salvar,
    onTicker: setAtivoSelecionado,
  });

  const carregando = isPending && todas.length === 0;
  const fontes = data?.fontes ?? [];

  return (
    <AppShell
      title="Notícias de Mercado"
      description="Manchetes das principais fontes financeiras, com radar da sua carteira"
    >
      <FitaIndices />

      {/* Busca + filtros */}
      <Panel bodyClassName="flex flex-col gap-3 p-3 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setSugestoesAbertas(true);
              }}
              onFocus={() => setSugestoesAbertas(true)}
              onBlur={() => window.setTimeout(() => setSugestoesAbertas(false), 150)}
              placeholder="Buscar por palavra-chave, ticker ou tema (ex: Petrobras, juros, IPCA)"
              aria-label="Buscar notícias"
              className="pl-9"
            />
            {busca ? (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            ) : null}

            {sugestoesAbertas && sugestoes.length > 0 ? (
              <ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                {sugestoes.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setBusca(s);
                        setSugestoesAbertas(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar notícias"
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <DialogPreferencias
              fontes={fontes}
              prefs={prefs}
              alternarLista={alternarLista}
              notificar={prefs.notificarCarteira}
              onNotificar={alternarNotificacoes}
            />
          </div>
        </div>

        <div className="rolagem-lateral flex items-center gap-1.5 pb-1">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              aria-pressed={categoria === c}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[0.82rem] font-semibold transition-colors ${
                categoria === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSoCarteira((v) => !v)}
            aria-pressed={soCarteira}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[0.82rem] font-semibold transition-colors ${
              soCarteira
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="size-4" aria-hidden="true" />
            Relacionadas à minha carteira
            {daCarteira.length > 0 ? (
              <span className="num rounded-full bg-primary px-1.5 text-[0.7rem] text-primary-foreground">
                {daCarteira.length}
              </span>
            ) : null}
          </button>

          <div className="flex items-center gap-2">
            <Label htmlFor="ordem-noticias" className="text-xs text-muted-foreground">
              Ordenar por
            </Label>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
              <SelectTrigger id="ordem-noticias" className="h-9 w-[10.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="relevantes">Mais relevantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      {/* Resumo do dia */}
      {!prefs.resumoOculto && resumoDoDia ? (
        <div className="panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Resumo do dia
            </p>
            <p className="mt-1 text-[0.95rem] leading-relaxed">{resumoDoDia}</p>
          </div>
          <button
            type="button"
            onClick={() => definir({ resumoOculto: true })}
            aria-label="Dispensar resumo do dia"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Aviso de novas notícias */}
      {novas > 0 ? (
        <button
          type="button"
          onClick={aplicarNovas}
          className="sticky top-14 z-20 mx-auto flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
          {novas} {novas === 1 ? "nova notícia disponível" : "novas notícias disponíveis"} — clique
          para atualizar
        </button>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {carregando ? (
            <>
              <EsqueletoHero />
              <div className="grid gap-4 sm:grid-cols-3">
                <EsqueletoMedio />
                <EsqueletoMedio />
                <EsqueletoMedio />
              </div>
              <div className="panel overflow-hidden">
                <EsqueletoLista />
              </div>
            </>
          ) : isError && todas.length === 0 ? (
            <Panel>
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertTriangle className="size-7 text-warning" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  Não foi possível carregar as notícias agora.
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  As fontes de notícias podem estar temporariamente indisponíveis.
                </p>
                <Button onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Tentar novamente
                </Button>
              </div>
            </Panel>
          ) : filtradas.length === 0 ? (
            <Panel>
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Search className="size-7 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold">Nenhuma notícia encontrada.</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ajuste a busca, escolha outra categoria ou desative o filtro da carteira.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBusca("");
                    setCategoria("Todas");
                    setSoCarteira(false);
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </Panel>
          ) : (
            <>
              {hero ? <CartaoHero {...propsCartao(hero)} /> : null}

              {destaques.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {destaques.map((n) => (
                    <CartaoMedio key={n.id} {...propsCartao(n)} />
                  ))}
                </div>
              ) : null}

              {feedVisivel.length > 0 ? (
                <Panel title="Últimas notícias" bodyClassName="p-0">
                  <div className="divide-y divide-border">
                    {feedVisivel.map((n) => (
                      <ItemFeed key={n.id} {...propsCartao(n)} />
                    ))}
                  </div>
                  {limite < feed.length ? (
                    <div ref={sentinela} className="flex justify-center border-t border-border p-4">
                      <Button variant="outline" onClick={() => setLimite((l) => l + PAGINA)}>
                        Carregar mais notícias
                      </Button>
                    </div>
                  ) : (
                    <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
                      Você chegou ao fim do feed
                      {dataUpdatedAt
                        ? ` · atualizado às ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </p>
                  )}
                </Panel>
              ) : null}
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <MaisLidas noticias={todas} leituras={prefs.leituras} onAbrir={abrir} />
          <AgendaEconomica />
          <RadarCarteira noticias={daCarteira} onAbrir={abrir} />
          <NoticiasSalvas
            salvas={prefs.salvas}
            onRemover={(id) => {
              const alvo = prefs.salvas.find((s) => s.id === id);
              if (alvo) alternarSalva(alvo);
            }}
          />
          <TermosDefinicoes />
        </aside>
      </div>

      <ModalNoticia
        noticia={aberta}
        salva={aberta ? salvasIds.has(aberta.id) : false}
        onOpenChange={(v) => !v && setAberta(null)}
        onSalvar={salvar}
      />

      {ativoSelecionado ? (
        <DialogDetalheAtivo
          simbolo={`${ativoSelecionado}.SA`}
          rotulo={ativoSelecionado}
          aberto={!!ativoSelecionado}
          onOpenChange={(v) => !v && setAtivoSelecionado(null)}
        />
      ) : null}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ *
 * Preferências do feed
 * ------------------------------------------------------------------ */

function DialogPreferencias({
  fontes,
  prefs,
  alternarLista,
  notificar,
  onNotificar,
}: {
  fontes: string[];
  prefs: { categorias: string[]; fontes: string[] };
  alternarLista: (campo: "categorias" | "fontes", valor: string) => void;
  notificar: boolean;
  onNotificar: (v: boolean) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Preferências de notícias">
          <SlidersHorizontal className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências de notícias</DialogTitle>
          <DialogDescription>
            Escolha os temas e veículos que aparecem por padrão no seu feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-border p-3">
            <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Label htmlFor="notificar-carteira" className="text-sm font-semibold">
                Notificar sobre minha carteira
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Alerta no sino do cabeçalho sempre que uma notícia citar um ativo que você possui.
              </p>
            </div>
            <Switch id="notificar-carteira" checked={notificar} onCheckedChange={onNotificar} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Categorias de interesse
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.filter((c) => c !== "Todas").map((c) => {
                const ativo = prefs.categorias.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => alternarLista("categorias", c)}
                    aria-pressed={ativo}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      ativo
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhuma selecionada = todas as categorias.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Fontes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {fontes.map((f) => {
                const ativo = prefs.fontes.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => alternarLista("fontes", f)}
                    aria-pressed={ativo}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      ativo
                        ? "border-primary bg-primary-soft text-accent-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
