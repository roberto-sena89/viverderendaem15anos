import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAtivos, useDividendos } from "@/lib/data";
import {
  criarCarteiraCompartilhada,
  excluirCarteiraCompartilhada,
  listarCarteirasCompartilhadas,
} from "@/lib/carteira-publica";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface CarteiraListada {
  id: string;
  token: string;
  nome: string;
  criado_em: string;
  expira_em: string | null;
  total_patrimonio: number;
  incluir_valores: boolean;
}

/** Compartilhamento de carteira pública — cria link e lista compartilhamentos. */
export function CarteiraPublicaCompartilhar() {
  const { data: ativos = [] } = useAtivos();
  const { data: dividendos = [] } = useDividendos();
  const [nome, setNome] = useState("Minha carteira");
  const [incluirValores, setIncluirValores] = useState(true);
  const [expirarDias, setExpirarDias] = useState(30);
  const [criando, setCriando] = useState(false);
  const [lista, setLista] = useState<CarteiraListada[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = () => {
    listarCarteirasCompartilhadas().then(setLista);
  };

  useEffect(carregar, []);

  async function compartilhar() {
    if (ativos.length === 0) {
      toast.error("Cadastre ativos na carteira antes de compartilhar.");
      return;
    }
    setCriando(true);
    const resultado = await criarCarteiraCompartilhada({
      nome,
      incluirValores,
      expirarEmDias: expirarDias > 0 ? expirarDias : undefined,
      ativos,
      dividendos,
    });
    setCriando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    try {
      await navigator.clipboard.writeText(resultado.url);
      toast.success("Link copiado!");
    } catch {
      toast.success("Link criado!");
    }
    setCopiado(resultado.token);
    setNome("Minha carteira");
    carregar();
  }

  async function excluir(id: string, _token: string) {
    const r = await excluirCarteiraCompartilhada(id);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success("Link desativado.");
    carregar();
  }

  async function copiarUrl(token: string) {
    const url = `${window.location.origin}/compartilhada/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2000);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="size-4 text-primary" />
          Carteira Pública Compartilhável
        </CardTitle>
        <CardDescription>
          Gere um link público com um snapshot da sua carteira — ideal para mostrar evolução para
          amigos, mentor ou redes sociais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome da carteira</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={incluirValores} onCheckedChange={setIncluirValores} />
              Incluir valores (R$)
            </label>
            <label className="flex items-center gap-2 text-sm">
              Expirar em
              <select
                className="h-8 rounded border border-border/60 bg-background px-2 text-sm"
                value={expirarDias}
                onChange={(e) => setExpirarDias(Number(e.target.value))}
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={0}>nunca</option>
              </select>
            </label>
          </div>
          <Button onClick={compartilhar} disabled={criando}>
            <Link2 className="mr-1.5 size-4" />
            {criando ? "Gerando link..." : "Gerar link público"}
          </Button>
        </div>

        {lista.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs font-medium text-muted-foreground">Links ativos</p>
            {lista.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /compartilhada/{item.token}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!item.incluir_valores && (
                    <Badge variant="outline" className="text-[10px]">
                      sem valores
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => copiarUrl(item.token)}
                    title="Copiar link"
                  >
                    {copiado === item.token ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => excluir(item.id, item.token)}
                    title="Desativar link"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
