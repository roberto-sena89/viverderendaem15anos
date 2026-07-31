import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, Search, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PainelCategoria } from "@/components/cotacoes/painel-categoria";
import { VisaoGeralMercado } from "@/components/cotacoes/visao-geral";
import { PainelFiis } from "@/components/fiis/painel-fiis";
import { PainelAcoes } from "@/components/acoes/painel-acoes";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { useFiltroFavoritos } from "@/lib/favoritos-mercado";
import type { CategoriaMercado } from "@/lib/grade-mercado.functions";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  head: () => ({
    meta: [
      { title: "Cotações ao vivo · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Grade de cotações em tempo real: ações e FIIs da B3, futuros, commodities, ETFs, criptomoedas e câmbio.",
      },
      { property: "og:title", content: "Cotações ao vivo · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Terminal de cotações com watchlist, filtros, sparklines e detalhes por ativo.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/cotacoes" }],
  }),
  component: Cotacoes,
});

const ABAS: { id: string; rotulo: string; categoria?: CategoriaMercado }[] = [
  { id: "geral", rotulo: "Visão geral" },
  { id: "acoes", rotulo: "Ações", categoria: "acoes" },
  { id: "fiis", rotulo: "FIIs", categoria: "fiis" },
  { id: "futuros", rotulo: "Futuros", categoria: "futuros" },
  { id: "commodities", rotulo: "Commodities", categoria: "commodities" },
  { id: "etfs", rotulo: "ETFs", categoria: "etfs" },
  { id: "cripto", rotulo: "Criptomoedas", categoria: "cripto" },
  { id: "cambio", rotulo: "Câmbio", categoria: "cambio" },
];

const INTERVALOS = [
  { ms: 15_000, rotulo: "15s" },
  { ms: 30_000, rotulo: "30s" },
  { ms: 60_000, rotulo: "1min" },
  { ms: 0, rotulo: "Manual" },
];

function Cotacoes() {
  const [aba, setAba] = useState("geral");
  const [busca, setBusca] = useState("");
  // Preferência do perfil: acompanha o usuário entre sessões e dispositivos.
  const [favoritos, definirFavoritos] = useFiltroFavoritos();
  const [intervalo, setIntervalo] = useState(30_000);
  const [pregao, setPregao] = useState(() => estadoPregao());
  const [ultima, setUltima] = useState<number | null>(null);
  const [parcial, setParcial] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setAgora(Date.now());
      setPregao(estadoPregao());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const aoAtualizar = useCallback((quando: number, incompleto: boolean) => {
    setUltima(quando);
    setParcial(incompleto);
  }, []);

  const segundos = ultima ? Math.max(0, Math.round((agora - ultima) / 1000)) : null;
  const legenda = useMemo(() => {
    if (intervalo === 0) return "Atualização manual";
    if (segundos === null) return "Sincronizando cotações…";
    return `Atualizado em tempo real · última sincronização há ${segundos}s`;
  }, [intervalo, segundos]);

  return (
    <AppShell title="Cotações" description={legenda}>
      <div className="space-y-4">
        {/* Status e controles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 text-sm">
            <span className="relative flex size-2.5" aria-hidden>
              <span
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-70 ${
                  pregao.aberto ? "bg-positive" : "bg-negative"
                }`}
              />
              <span
                className={`relative inline-flex size-2.5 rounded-full ${
                  pregao.aberto ? "bg-positive" : "bg-negative"
                }`}
              />
            </span>
            <strong className="font-medium">{pregao.aberto ? "Pregão aberto" : "Pregão fechado"}</strong>
            <span className="text-muted-foreground">
              {pregao.aberto
                ? "B3 · 10h–18h · cripto 24/7"
                : `B3 reabre ${pregao.proximaAbertura} · cripto 24/7`}
            </span>
          </span>

          {parcial ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Alguns ativos com dado desatualizado
            </span>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ticker ou nome"
                aria-label="Buscar ativo na grade de cotações"
                className="h-9 w-[220px] pl-8 text-sm"
              />
            </div>
            <Button
              variant={favoritos ? "default" : "outline"}
              size="sm"
              aria-pressed={favoritos}
              onClick={() => definirFavoritos()}
            >
              <Star className={`size-4 ${favoritos ? "fill-current" : ""}`} />
              Favoritos
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              <Radio className="mx-1 size-3.5 text-muted-foreground" aria-hidden />
              {INTERVALOS.map((i) => (
                <button
                  key={i.rotulo}
                  type="button"
                  onClick={() => setIntervalo(i.ms)}
                  aria-pressed={intervalo === i.ms}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    intervalo === i.ms
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {i.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Tabs value={aba} onValueChange={setAba}>
          <div className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-background/95 px-1 py-1 backdrop-blur">
            <TabsList className="w-max">
              {ABAS.map((a) => (
                <TabsTrigger key={a.id} value={a.id}>
                  {a.rotulo}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="geral" className="mt-4">
            <VisaoGeralMercado intervaloMs={intervalo} />
          </TabsContent>

          <TabsContent value="fiis" className="mt-4">
            <PainelFiis intervaloMs={intervalo} busca={busca} apenasFavoritos={favoritos} />
          </TabsContent>

          <TabsContent value="acoes" className="mt-4">
            <PainelAcoes intervaloMs={intervalo} busca={busca} apenasFavoritos={favoritos} />
          </TabsContent>

          {ABAS.filter((a) => a.categoria && a.id !== "fiis" && a.id !== "acoes").map((a) => (
            <TabsContent key={a.id} value={a.id} className="mt-4">
              <PainelCategoria
                categoria={a.categoria as CategoriaMercado}
                titulo={a.rotulo}
                intervaloMs={intervalo}
                busca={busca}
                apenasFavoritos={favoritos}
                aoAtualizar={aoAtualizar}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
