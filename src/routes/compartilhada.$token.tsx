import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarClock, LinkIcon, Lock, PieChart } from "lucide-react";
import { lerCarteiraCompartilhada } from "@/lib/carteira-publica.functions";
import { brl } from "@/lib/portfolio";
import { CabecalhoPublico } from "@/components/cabecalho-publico";
import { RodapePublico } from "@/components/rodape-publico";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { urlAbsoluta } from "@/lib/seo";

export const Route = createFileRoute("/compartilhada/$token")({
  component: CarteiraCompartilhadaPage,
  head: () => ({
    meta: [
      { title: "Carteira compartilhada · Viver de Renda em 15 Anos" },
      { name: "description", content: "Carteira de investimentos compartilhada publicamente." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
});

function CarteiraCompartilhadaPage() {
  const { token } = Route.useParams();

  const { data: dados, isLoading } = useQuery({
    queryKey: ["carteira-compartilhada", token],
    queryFn: () => lerCarteiraCompartilhada({ data: { token } }),
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <CabecalhoPublico />

      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : !dados ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Lock className="mx-auto mb-3 size-8 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Link indisponível</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta carteira compartilhada não existe, foi desativada ou expirou.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link to="/">
                  <ArrowLeft className="mr-1.5 size-4" /> Voltar ao início
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-primary" />
              <h1 className="font-display text-xl font-bold">{dados.nome}</h1>
              <Badge variant="secondary" className="text-[10px]">
                Público
              </Badge>
            </div>

            {/* Métricas */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Patrimônio</CardDescription>
                  <CardTitle className="text-xl">
                    {dados.incluirValores ? brl(dados.totalPatrimonio) : "—"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Dividend yield</CardDescription>
                  <CardTitle className="text-xl">
                    {dados.incluirValores && dados.dividendYield != null
                      ? dados.dividendYield.toFixed(2) + "%"
                      : "—"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Renda mensal estimada</CardDescription>
                  <CardTitle className="text-xl">
                    {dados.incluirValores && dados.rendaMensalEstimada != null
                      ? brl(dados.rendaMensalEstimada)
                      : "—"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Ativos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChart className="size-4 text-primary" />
                  Ativos ({dados.ativos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dados.ativos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum ativo neste snapshot.
                  </p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {dados.ativos.map((a) => (
                      <div
                        key={a.ticker}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{a.ticker}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{a.categoria}</span>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-muted-foreground">{a.quantidade} cotas</span>
                          {dados.incluirValores && (
                            <span className="font-medium">
                              {a.valor != null ? brl(a.valor) : "—"}
                              {a.dy != null && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {a.dy.toFixed(1)}%
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {dados.expiraEm && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Este link expira em {new Date(dados.expiraEm).toLocaleDateString("pt-BR")}.
              </p>
            )}

            {!dados.incluirValores && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" />O dono optou por compartilhar sem valores em reais.
              </p>
            )}

            <p className="flex items-center justify-center gap-1.5 pt-4 text-xs text-muted-foreground">
              <LinkIcon className="size-3.5" />
              Criado com{" "}
              <a href={urlAbsoluta("/")} className="font-medium underline underline-offset-2">
                Viver de Renda em 15 Anos
              </a>
            </p>
          </div>
        )}
      </main>

      <RodapePublico />
    </div>
  );
}
