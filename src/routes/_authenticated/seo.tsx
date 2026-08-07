import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  MousePointerClick,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { obterPainelSeo, type PainelSeo, type TotaisSeo } from "@/lib/seo.functions";

export const Route = createFileRoute("/_authenticated/seo")({
  head: () => ({
    meta: [
      { title: "SEO & Busca · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Acompanhe indexação, erros de sitemap e performance nas buscas do Google no dia a dia.",
      },
      { property: "og:title", content: "SEO & Busca · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Painel diário de indexação, erros e performance orgânica do site.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/seo" }],
  }),
  component: PaginaSeo,
});

const inteiro = new Intl.NumberFormat("pt-BR");
const umaCasa = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

function Kpi({
  rotulo,
  valor,
  delta,
  invertido = false,
  icone: Icone,
}: {
  rotulo: string;
  valor: string;
  delta: number;
  invertido?: boolean;
  icone: typeof Search;
}) {
  const bom = invertido ? delta <= 0 : delta >= 0;
  return (
    <div className="panel flex flex-col gap-1 p-4">
      <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icone className="size-4" aria-hidden />
        {rotulo}
      </span>
      <strong className="num font-display text-2xl font-bold">{valor}</strong>
      <span className={`num text-xs font-medium ${bom ? "text-success" : "text-destructive"}`}>
        {delta >= 0 ? "+" : ""}
        {umaCasa.format(delta)}% vs. 28 dias anteriores
      </span>
    </div>
  );
}

function Tabela({
  titulo,
  primeiraColuna,
  linhas,
}: {
  titulo: string;
  primeiraColuna: string;
  linhas: PainelSeo["consultas"];
}) {
  return (
    <Panel title={titulo} bodyClassName="p-0">
      {linhas.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Sem dados reportados no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  {primeiraColuna}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Cliques
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Impressões
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  CTR
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Posição
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[18rem] truncate px-4 py-2" title={l.chave}>
                    {l.chave}
                  </td>
                  <td className="num px-3 py-2 text-right">{inteiro.format(l.cliques)}</td>
                  <td className="num px-3 py-2 text-right">{inteiro.format(l.impressoes)}</td>
                  <td className="num px-3 py-2 text-right">{umaCasa.format(l.ctr * 100)}%</td>
                  <td className="num px-4 py-2 text-right">{umaCasa.format(l.posicao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SeloIndexacao({ veredito }: { veredito?: string }) {
  const ok = veredito === "PASS";
  const neutro = !veredito || veredito === "VERDICT_UNSPECIFIED";
  const Icone = ok ? CheckCircle2 : neutro ? AlertTriangle : XCircle;
  const cor = ok ? "text-success" : neutro ? "text-muted-foreground" : "text-destructive";
  const texto = ok ? "Indexada" : neutro ? "Sem dados" : "Não indexada";
  return (
    <span className={`flex items-center gap-1.5 font-medium ${cor}`}>
      <Icone className="size-4 shrink-0" aria-hidden />
      {texto}
    </span>
  );
}

function totaisZerados(): TotaisSeo {
  return { cliques: 0, impressoes: 0, ctr: 0, posicao: 0 };
}

function PaginaSeo() {
  const buscar = useServerFn(obterPainelSeo);
  const [siteUrl, setSiteUrl] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["painel-seo", siteUrl],
    queryFn: () => buscar({ data: { siteUrl } }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const painel = data?.status === "selecionado" ? data.painel : undefined;
  const totais = painel?.totais ?? totaisZerados();
  const anteriores = painel?.totaisAnteriores ?? totaisZerados();

  return (
    <AppShell title="SEO & Busca" description="Indexação, erros e performance no Google">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {painel
            ? `Propriedade ${painel.siteUrl} · período ${painel.periodo.inicio} a ${painel.periodo.fim} (o Google tem ~3 dias de defasagem).`
            : "Dados do Google Search Console."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
          Atualizar
        </Button>
      </div>

      {error ? (
        <Panel title="Não foi possível carregar">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erro ao consultar o Search Console."}
          </p>
        </Panel>
      ) : null}

      {data?.status === "selecao_necessaria" ? (
        <Panel title="Escolha a propriedade do Search Console">
          <ul className="flex flex-col gap-2">
            {data.candidatos.map((c) => (
              <li key={c}>
                <Button variant="outline" size="sm" onClick={() => setSiteUrl(c)}>
                  {c}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel h-28 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : null}

      {painel ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              rotulo="Cliques"
              valor={inteiro.format(totais.cliques)}
              delta={variacao(totais.cliques, anteriores.cliques)}
              icone={MousePointerClick}
            />
            <Kpi
              rotulo="Impressões"
              valor={inteiro.format(totais.impressoes)}
              delta={variacao(totais.impressoes, anteriores.impressoes)}
              icone={TrendingUp}
            />
            <Kpi
              rotulo="CTR médio"
              valor={`${umaCasa.format(totais.ctr * 100)}%`}
              delta={variacao(totais.ctr, anteriores.ctr)}
              icone={Search}
            />
            <Kpi
              rotulo="Posição média"
              valor={umaCasa.format(totais.posicao)}
              delta={variacao(totais.posicao, anteriores.posicao)}
              invertido
              icone={TrendingUp}
            />
          </div>

          <Panel title="Cliques e impressões por dia">
            {painel.serie.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sem dados reportados no período.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={painel.serie} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="data"
                      tickFormatter={(v: string) => v.slice(5).replace("-", "/")}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                        color: "var(--color-popover-foreground)",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressoes"
                      name="Impressões"
                      stroke="var(--color-serie-investido)"
                      fill="var(--color-serie-investido)"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="cliques"
                      name="Cliques"
                      stroke="var(--color-serie-ganho)"
                      fill="var(--color-serie-ganho)"
                      fillOpacity={0.28}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Tabela titulo="Principais buscas" primeiraColuna="Consulta" linhas={painel.consultas} />
            <Tabela titulo="Páginas mais vistas" primeiraColuna="Página" linhas={painel.paginas} />
          </div>

          <Panel title="Sitemaps e erros" bodyClassName="p-0">
            {painel.sitemaps.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum sitemap enviado ou sem permissão de leitura.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border">
                      <th scope="col" className="px-4 py-2 text-left font-medium">Sitemap</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Erros</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Avisos</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">URLs enviadas</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Último download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {painel.sitemaps.map((s) => (
                      <tr key={s.caminho} className="border-b border-border/60 last:border-0">
                        <td className="max-w-[22rem] truncate px-4 py-2" title={s.caminho}>
                          {s.caminho}
                        </td>
                        <td
                          className={`num px-3 py-2 text-right ${s.erros > 0 ? "font-semibold text-destructive" : ""}`}
                        >
                          {inteiro.format(s.erros)}
                        </td>
                        <td className="num px-3 py-2 text-right">{inteiro.format(s.avisos)}</td>
                        <td className="num px-3 py-2 text-right">{inteiro.format(s.urlsEnviadas)}</td>
                        <td className="num px-4 py-2 text-right">
                          {s.ultimoDownload
                            ? new Date(s.ultimoDownload).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Indexação das páginas públicas"
            hint="Estado da versão que o Google tem no índice — não é um teste ao vivo."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-2 text-left font-medium">Página</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Status</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Cobertura</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Último rastreio</th>
                  </tr>
                </thead>
                <tbody>
                  {painel.indexacao.map((p) => (
                    <tr key={p.caminho} className="border-b border-border/60 last:border-0">
                      <td className="max-w-[16rem] truncate px-4 py-2" title={p.url}>
                        {p.caminho}
                      </td>
                      <td className="px-3 py-2">
                        {p.erro ? (
                          <span className="text-muted-foreground">Indisponível</span>
                        ) : (
                          <SeloIndexacao veredito={p.veredito} />
                        )}
                      </td>
                      <td className="max-w-[18rem] truncate px-3 py-2 text-muted-foreground">
                        {p.erro ?? p.cobertura ?? "—"}
                      </td>
                      <td className="num px-4 py-2 text-right">
                        {p.ultimoRastreio
                          ? new Date(p.ultimoRastreio).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}
