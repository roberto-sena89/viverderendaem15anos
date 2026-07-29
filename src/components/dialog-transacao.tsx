import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCriarAporte } from "@/lib/data";
import { brl, categorias, type Categoria } from "@/lib/portfolio";

const INSTITUICOES = [
  "Ágora Investimentos",
  "BTG Pactual",
  "Banco do Brasil",
  "Bradesco",
  "Clear",
  "Inter",
  "Itaú",
  "Nubank",
  "Rico",
  "Toro",
  "XP Investimentos",
];

const numero = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function DialogTransacao({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"compra" | "venda">("compra");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [corretagem, setCorretagem] = useState("");
  const [emolumentos, setEmolumentos] = useState("");
  const [impostos, setImpostos] = useState("");
  const [instituicao, setInstituicao] = useState("");

  const criar = useCriarAporte();

  const custos = numero(corretagem) + numero(emolumentos) + numero(impostos);
  const valorTotal = useMemo(
    () => numero(preco) * numero(quantidade) + custos,
    [preco, quantidade, custos],
  );

  const instituicoesFiltradas = INSTITUICOES.filter((i) =>
    i.toLowerCase().includes(instituicao.toLowerCase()),
  );

  function limpar() {
    setTipo("compra");
    setCategoria("");
    setTicker("");
    setData(new Date().toISOString().slice(0, 10));
    setPreco("");
    setQuantidade("");
    setCorretagem("");
    setEmolumentos("");
    setImpostos("");
    setInstituicao("");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria) return toast.error("Selecione a categoria.");
    if (!ticker.trim()) return toast.error("Informe o nome ou código do ativo.");
    if (numero(preco) <= 0) return toast.error("Informe um preço válido.");
    if (numero(quantidade) <= 0) return toast.error("Informe uma quantidade válida.");
    if (!instituicao.trim()) return toast.error("Informe a instituição.");

    criar.mutate(
      {
        data,
        corretora: instituicao.trim(),
        ticker: ticker.trim().toUpperCase(),
        categoria,
        quantidade: tipo === "venda" ? -numero(quantidade) : numero(quantidade),
        preco: numero(preco),
        taxas: custos,
        observacoes: tipo === "venda" ? "Venda" : undefined,
      },
      {
        onSuccess: () => {
          toast.success(tipo === "venda" ? "Venda registrada." : "Aporte registrado.");
          limpar();
          setAberto(false);
        },
        onError: () => toast.error("Não foi possível salvar a transação."),
      },
    );
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) limpar();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Transação</DialogTitle>
          <DialogDescription>
            Preencha os dados, navegue pelas categorias e adicione ativos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-5">
          <div className="flex justify-center">
            <div className="inline-flex rounded-md border p-1">
              {(["compra", "venda"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={cn(
                    "rounded px-6 py-1.5 text-sm font-medium capitalize transition-colors",
                    tipo === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Nome ou código do ativo *</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ticker"
                  className="pl-9 uppercase"
                  placeholder={categoria ? "Ex.: BBAS3" : "Selecione uma categoria"}
                  disabled={!categoria}
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="data">
                {tipo === "venda" ? "Data da venda *" : "Data da compra *"}
              </Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preco">Preço *</Label>
              <Input
                id="preco"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qtd">Quantidade *</Label>
              <Input
                id="qtd"
                inputMode="decimal"
                placeholder="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Outros custos</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="corretagem">Corretagem</Label>
                <Input
                  id="corretagem"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={corretagem}
                  onChange={(e) => setCorretagem(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emolumentos">Emolumentos</Label>
                <Input
                  id="emolumentos"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={emolumentos}
                  onChange={(e) => setEmolumentos(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impostos">Impostos</Label>
                <Input
                  id="impostos"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={impostos}
                  onChange={(e) => setImpostos(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor total</Label>
              <Input readOnly value={brl(valorTotal, 2)} className="bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instituicao">Instituição *</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="instituicao"
                  className="pl-9"
                  list="instituicoes"
                  placeholder="Procure uma instituição"
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                />
                <datalist id="instituicoes">
                  {instituicoesFiltradas.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? "Salvando..." : "Adicionar Transação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
