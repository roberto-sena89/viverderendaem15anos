import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TextoTruncado } from "@/components/texto-truncado";
import { PainelCategoria } from "@/components/cotacoes/painel-categoria";
import { VisaoGeralMercado } from "@/components/cotacoes/visao-geral";
import { PainelFiis } from "@/components/fiis/painel-fiis";
import { PainelAcoes } from "@/components/acoes/painel-acoes";
import { PainelEtfs } from "@/components/etfs/painel-etfs";
import { PainelCripto } from "@/components/cripto/painel-cripto";
import { PainelCommodities } from "@/components/commodities/painel-commodities";
import { PainelIndices } from "@/components/indices/painel-indices";
import { PainelTesouro } from "@/components/tesouro/painel-tesouro";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import {
  ABAS_COTACOES,
  ABAS_CATEGORIA_GENERICA,
  CLASSES_BARRA_ABAS,
  CLASSES_CABECALHO_FIXO,
  CLASSES_LISTA_ABAS,
  CLASSES_GATILHO_ABA,
  CLASSES_ICONE_ABA,
  CLASSES_ROTULO_ABA,
  CLASSES_BUSCA,
} from "@/lib/cotacoes-abas";
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

const ABAS = ABAS_COTACOES;


function Cotacoes() {
  const [aba, setAba] = useState("geral");
  const [busca, setBusca] = useState("");
  // Preferência do perfil: acompanha o usuário entre sessões e dispositivos.
  const intervalo = 30_000;
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

  const abrirAba = useCallback((id: string, filtro?: string) => {
    setAba(id);
    setBusca(filtro ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const aoAtualizar = useCallback((quando: number, incompleto: boolean) => {
    setUltima(quando);
    setParcial(incompleto);
  }, []);

  const segundos = ultima ? Math.max(0, Math.round((agora - ultima) / 1000)) : null;
  const legenda = useMemo(() => {
    if (segundos === null) return "Sincronizando cotações…";
    return `Atualizado em tempo real · última sincronização há ${segundos}s`;
  }, [segundos]);

  return (
    <AppShell title="Cotações" description={legenda}>
      <div className="space-y-4">
        {/* Status do pregão */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm">
            <span className="relative flex size-2.5 shrink-0" aria-hidden>
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
        </div>

        <TooltipProvider delayDuration={150}>
        <Tabs value={aba} onValueChange={setAba}>
          {/* Cabeçalho fixo no mobile: busca + abas acompanham a rolagem */}
          <div className={CLASSES_CABECALHO_FIXO}>
            <div className={CLASSES_BARRA_ABAS}>
              <TabsList className={CLASSES_LISTA_ABAS}>
                {ABAS.map((a) => {
                  const Icone = a.icone;
                  return (
                    <TabsTrigger
                      key={a.id}
                      value={a.id}
                      className={CLASSES_GATILHO_ABA}
                      title={a.rotulo}
                    >
                      <Icone className={CLASSES_ICONE_ABA} aria-hidden />
                      <TextoTruncado
                        className={CLASSES_ROTULO_ABA}
                        texto={a.rotulo}
                        lado="bottom"
                        passivo
                      >
                        <span className="sm:hidden">{a.rotuloCurto ?? a.rotulo}</span>
                        <span className="hidden sm:inline">{a.rotulo}</span>
                      </TextoTruncado>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="relative w-full min-w-0 px-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ticker ou nome"
                aria-label="Buscar ativo na grade de cotações"
                className={CLASSES_BUSCA}
              />
            </div>
          </div>


          <TabsContent value="geral" className="mt-4">
            <VisaoGeralMercado intervaloMs={intervalo} aoAbrirAba={abrirAba} />
          </TabsContent>

          <TabsContent value="fiis" className="mt-4">
            <PainelFiis intervaloMs={intervalo} busca={busca} />
          </TabsContent>

          <TabsContent value="acoes" className="mt-4">
            <PainelAcoes intervaloMs={intervalo} busca={busca} />
          </TabsContent>

          <TabsContent value="etfs" className="mt-4">
            <PainelEtfs intervaloMs={intervalo} busca={busca} />
          </TabsContent>

          <TabsContent value="indices" className="mt-4">
            <PainelIndices intervaloMs={intervalo} busca={busca} />
          </TabsContent>

          <TabsContent value="tesouro" className="mt-4">
            <PainelTesouro busca={busca} />
          </TabsContent>

          <TabsContent value="cripto" className="mt-4">
            <PainelCripto
              intervaloMs={intervalo}
              busca={busca}
              aoAtualizar={aoAtualizar}
            />
          </TabsContent>



          <TabsContent value="commodities" className="mt-4">
            <PainelCommodities
              intervaloMs={intervalo}
              busca={busca}
              aoAtualizar={aoAtualizar}
            />
          </TabsContent>

          {ABAS_CATEGORIA_GENERICA.map((a) => (
            <TabsContent key={a.id} value={a.id} className="mt-4">
              <PainelCategoria
                categoria={a.categoria as CategoriaMercado}
                titulo={a.rotulo}
                intervaloMs={intervalo}
                busca={busca}
                aoAtualizar={aoAtualizar}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
