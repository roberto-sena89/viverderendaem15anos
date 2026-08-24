import { useState } from "react";
import { ExternalLink, Landmark, Loader2, RefreshCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAtivos } from "@/lib/data";
import { brl } from "@/lib/portfolio";
import { usePosicoesMeuPluggy, useSincronizarMeuPluggy } from "@/lib/pluggy";
import { BotaoConectarPluggy } from "@/components/pluggy-connect-widget";

const Loader = Loader2;

/** Links oficiais do fluxo de configuração do Meu Pluggy + Ágora. */
const URLS = {
  agora: "https://agorainvestimentos.com.br",
  meuPluggy: "https://meu.pluggy.ai",
  dashboardPluggy: "https://dashboard.pluggy.ai",
} as const;

/** Link externo estilizado, abre em nova aba. */
function LinkOficial({
  href,
  label,
  descricao,
}: {
  href: string;
  label: string;
  descricao: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-0.5 rounded-lg border border-border/60 bg-card/50 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        <ExternalLink className="size-3.5 shrink-0 text-primary" />
        {label}
      </span>
      <span className="text-[11px] leading-tight text-muted-foreground">{descricao}</span>
    </a>
  );
}

/** Bloco de configuração com o passo a passo e os links oficiais. */
function PassoAPassoConfiguracao() {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Como sincronizar com a Ágora Investimentos
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>
          Conecte sua conta <span className="font-medium text-foreground">Ágora Investimentos</span>{" "}
          no Meu Pluggy (Open Finance), autorizando o acesso às suas posições.
        </li>
        <li>
          No Dashboard Pluggy, crie uma aplicação e copie o{" "}
          <span className="font-medium text-foreground">Client ID</span> e o{" "}
          <span className="font-medium text-foreground">Client Secret</span>.
        </li>
        <li>
          Preencha as variáveis <code className="text-[10px]">PLUGGY_CLIENT_ID</code> e{" "}
          <code className="text-[10px]">PLUGGY_CLIENT_SECRET</code> no ambiente do deploy.
        </li>
        <li>Volte aqui e clique em "Sincronizar carteira" para buscar as posições.</li>
      </ol>
      <div className="grid gap-2 pt-1 sm:grid-cols-3">
        <LinkOficial
          href={URLS.agora}
          label="Ágora Investimentos"
          descricao="Site oficial do Bradesco para investir"
        />
        <LinkOficial
          href={URLS.meuPluggy}
          label="Meu Pluggy"
          descricao="Conecte sua conta Ágora e fique dono dos dados"
        />
        <LinkOficial
          href={URLS.dashboardPluggy}
          label="Dashboard Pluggy"
          descricao="Pegue o Client ID e Client Secret da aplicação"
        />
      </div>
    </div>
  );
}

/** Botão + diálogo para sincronizar as posições com o Meu Pluggy (Ágora Investimentos). */
export function DialogMeuPluggy() {
  const { data: ativos = [] } = useAtivos();
  const [aberto, setAberto] = useState(false);
  const posicoesQuery = usePosicoesMeuPluggy();
  const sincronizar = useSincronizarMeuPluggy();

  const posicoes = posicoesQuery.data ?? [];
  const mapAtivos = new Map(ativos.map((a) => [a.ticker.toUpperCase(), a]));
  const totalPluggy = posicoes.reduce((s, p) => s + p.valorAtual, 0);
  const totalApp = ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0);
  const diferenca = totalPluggy - totalApp;

  const refetch = () => void posicoesQuery.refetch();

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3"
          aria-label="Sincronizar posições com o Meu Pluggy (Ágora)"
          title="Sincronizar suas posições da Ágora Investimentos via Meu Pluggy"
        >
          <RefreshCcw className="size-4 shrink-0 sm:mr-1.5" />
          <span className="hidden truncate sm:inline">Meu Pluggy</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="text-primary size-5" /> Meu Pluggy · Ágora
          </DialogTitle>
          <DialogDescription>
            Posições de investimentos lidas do seu Meu Pluggy (Open Finance), comparadas com sua
            carteira atual.
          </DialogDescription>
        </DialogHeader>

        {posicoesQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader className="text-primary size-5 animate-spin" aria-label="Consultando..." />
          </div>
        ) : posicoesQuery.isError ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">Não foi possível conectar com o Meu Pluggy.</p>
            <p className="text-muted-foreground">
              {posicoesQuery.error instanceof Error
                ? posicoesQuery.error.message
                : "Erro desconhecido"}
            </p>
            <p className="text-muted-foreground text-xs">
              Verifique que configurou <code className="text-[10px]">PLUGGY_CLIENT_ID</code> e{" "}
              <code className="text-[10px]">PLUGGY_CLIENT_SECRET</code> (disponíveis no{" "}
              <a
                href={URLS.dashboardPluggy}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Dashboard Pluggy
              </a>
              ) e conectou suas contas em{" "}
              <a
                href={URLS.meuPluggy}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                meu.pluggy.ai
              </a>
              .
            </p>
          </div>
        ) : posicoes.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nenhuma posição encontrada. Conecte sua conta Ágora Investimentos no{" "}
            <a
              href={URLS.meuPluggy}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              meu.pluggy.ai
            </a>{" "}
            para sincronizar seus ativos.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border/60 bg-card/50 p-3.5">
              <div>
                <p className="text-muted-foreground text-xs">Ágora (Meu Pluggy)</p>
                <p className="text-lg font-semibold">{brl(totalPluggy)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Seu app</p>
                <p className="text-lg font-semibold">{brl(totalApp)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Divergência total</p>
                <p
                  className={`text-lg font-semibold ${diferenca >= 0 ? "text-positive" : "text-negative"}`}
                >
                  {diferenca >= 0 ? "+" : ""}
                  {brl(diferenca)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Ativo</th>
                    <th className="px-3 py-2 text-right">Qtd.</th>
                    <th className="px-3 py-2 text-right">Ágora</th>
                    <th className="px-3 py-2 text-right">App</th>
                  </tr>
                </thead>
                <tbody>
                  {posicoes.map((p) => {
                    const ativo = mapAtivos.get(p.ticker.toUpperCase());
                    const appValor = ativo ? ativo.quantidade * ativo.precoAtual : 0;
                    return (
                      <tr key={p.id} className="border-t border-border/40">
                        <td className="px-3 py-2">
                          <span className="font-medium">{p.ticker}</span>
                          <span className="block truncate text-muted-foreground">{p.nome}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {p.quantidade.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{brl(p.valorAtual)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {ativo ? brl(appValor) : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Passo a passo + links oficiais — sempre visível para configurar/sincronizar. */}
        <PassoAPassoConfiguracao />

        <DialogFooter className="flex-wrap gap-2">
          <BotaoConectarPluggy
            rotulo="Conectar instituição"
            onConectado={() => void posicoesQuery.refetch()}
          />
          <Button variant="outline" onClick={refetch} disabled={posicoesQuery.isLoading}>
            <RefreshCcw className="size-4" /> Atualizar
          </Button>
          <Button
            onClick={() => sincronizar.mutate()}
            disabled={sincronizar.isPending || posicoes.length === 0}
            className="gap-2"
          >
            <Wallet className="size-4" />
            {sincronizar.isPending ? "Sincronizando..." : "Sincronizar carteira"}
          </Button>
        </DialogFooter>
        {sincronizar.isError && (
          <p className="text-destructive text-xs">
            {sincronizar.error instanceof Error
              ? sincronizar.error.message
              : "Erro ao sincronizar."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
