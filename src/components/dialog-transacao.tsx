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
import { useAtualizarAporte, useCriarAporte } from "@/lib/data";
import { brl, categorias, type Aporte, type Categoria } from "@/lib/portfolio";

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
  const n = Number(String(v).trim().replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Aceita apenas dígitos, ponto e vírgula (formato monetário brasileiro). */
const monetarioValido = (v: string) => /^\d{1,3}(\.\d{3})*(,\d{1,8})?$|^\d+([.,]\d{1,8})?$/.test(v.trim());

/** Formata o campo para o padrão brasileiro (1.234,56) ao sair do input. */
const formatarMoeda = (v: string) => {
  if (!v.trim()) return "";
  if (!monetarioValido(v)) return v;
  return numero(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const HOJE = () => new Date().toISOString().slice(0, 10);
const DATA_MINIMA = "1990-01-01";
const LIMITE_VALOR = 1_000_000_000;

type Erros = Partial<
  Record<
    "data" | "categoria" | "ticker" | "preco" | "quantidade" | "corretagem" | "emolumentos" | "impostos" | "instituicao" | "descricao",
    string
  >
>;

function MensagemErro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} role="alert" className="text-[0.75rem] font-medium text-destructive">
      {texto}
    </p>
  );
}

export function DialogTransacao({
  children,
  aporte,
}: {
  children: ReactNode;
  aporte?: Aporte;
}) {
  const edicao = Boolean(aporte);
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
  const [descricao, setDescricao] = useState("");
  const [erros, setErros] = useState<Erros>({});

  const limparErro = (campo: keyof Erros) =>
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));

  const criar = useCriarAporte();
  const atualizar = useAtualizarAporte();
  const salvando = criar.isPending || atualizar.isPending;

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
    setDescricao("");
    setErros({});
  }

  function preencher() {
    if (!aporte) return limpar();
    setTipo(aporte.quantidade < 0 ? "venda" : "compra");
    setCategoria(aporte.categoria);
    setTicker(aporte.ticker);
    setData(aporte.data);
    setPreco(String(aporte.preco));
    setQuantidade(String(Math.abs(aporte.quantidade)));
    setCorretagem(aporte.taxas ? String(aporte.taxas) : "");
    setEmolumentos("");
    setImpostos("");
    setInstituicao(aporte.corretora ?? "");
    setDescricao(aporte.observacoes ?? "");
    setErros({});
  }

  /** Valida todos os campos antes de gravar no banco. */
  function validar(): Erros {
    const e: Erros = {};

    if (!data) e.data = "Informe a data da operação.";
    else if (Number.isNaN(Date.parse(data))) e.data = "Data inválida.";
    else if (data > HOJE()) e.data = "A data não pode ser futura.";
    else if (data < DATA_MINIMA) e.data = "Use uma data a partir de 01/01/1990.";

    if (!categoria) e.categoria = "Selecione a categoria.";

    const t = ticker.trim();
    if (!t) e.ticker = "Informe o nome ou código do ativo.";
    else if (t.length < 2) e.ticker = "Use ao menos 2 caracteres.";
    else if (t.length > 20) e.ticker = "Máximo de 20 caracteres.";
    else if (!/^[A-Za-z0-9À-ÿ.\-\s]+$/.test(t)) e.ticker = "Use apenas letras, números, ponto e hífen.";

    if (!preco.trim()) e.preco = "Informe o preço.";
    else if (!monetarioValido(preco)) e.preco = "Formato inválido. Use 1.234,56.";
    else if (numero(preco) <= 0) e.preco = "O preço deve ser maior que zero.";
    else if (numero(preco) > LIMITE_VALOR) e.preco = "Valor acima do limite permitido.";

    if (!quantidade.trim()) e.quantidade = "Informe a quantidade.";
    else if (!monetarioValido(quantidade)) e.quantidade = "Formato inválido. Use 10 ou 10,5.";
    else if (numero(quantidade) <= 0) e.quantidade = "A quantidade deve ser maior que zero.";
    else if (numero(quantidade) > LIMITE_VALOR) e.quantidade = "Quantidade acima do limite permitido.";

    ([
      ["corretagem", corretagem],
      ["emolumentos", emolumentos],
      ["impostos", impostos],
    ] as const).forEach(([campo, valor]) => {
      if (!valor.trim()) return;
      if (!monetarioValido(valor)) e[campo] = "Formato inválido. Use 1.234,56.";
      else if (numero(valor) < 0) e[campo] = "O custo não pode ser negativo.";
      else if (numero(valor) > LIMITE_VALOR) e[campo] = "Valor acima do limite permitido.";
    });

    if (!instituicao.trim()) e.instituicao = "Informe a instituição.";
    else if (instituicao.trim().length > 60) e.instituicao = "Máximo de 60 caracteres.";

    if (descricao.trim().length > 200) e.descricao = "Máximo de 200 caracteres.";

    return e;
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    const validacao = validar();
    setErros(validacao);
    const pendentes = Object.values(validacao).filter(Boolean);
    if (pendentes.length > 0) {
      toast.error(
        pendentes.length === 1
          ? String(pendentes[0])
          : `Corrija ${pendentes.length} campos antes de salvar.`,
      );
      return;
    }

    const payload = {
      data,
      corretora: instituicao.trim(),
      ticker: ticker.trim().toUpperCase(),
      categoria: categoria as Categoria,
      quantidade: tipo === "venda" ? -numero(quantidade) : numero(quantidade),
      preco: numero(preco),
      taxas: custos,
      observacoes: descricao.trim() || (tipo === "venda" ? "Venda" : undefined),
    };

    const opcoes = {
      onSuccess: () => {
        toast.success(
          edicao
            ? "Transação atualizada e totais recalculados."
            : tipo === "venda"
              ? "Venda registrada."
              : "Aporte registrado.",
        );
        setAberto(false);
      },
      onError: () => toast.error("Não foi possível salvar a transação."),
    };

    if (edicao && aporte) atualizar.mutate({ id: aporte.id, ...payload }, opcoes);
    else criar.mutate(payload, opcoes);
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) preencher();
        else limpar();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar Transação" : "Adicionar Transação"}</DialogTitle>
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
              <Select
                value={categoria}
                onValueChange={(v) => {
                  setCategoria(v as Categoria);
                  limparErro("categoria");
                }}
              >
                <SelectTrigger aria-invalid={!!erros.categoria}>
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
              <MensagemErro id="erro-categoria" texto={erros.categoria} />
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
                  aria-invalid={!!erros.ticker}
                  aria-describedby={erros.ticker ? "erro-ticker" : undefined}
                  onChange={(e) => {
                    setTicker(e.target.value);
                    limparErro("ticker");
                  }}
                />
              </div>
              <MensagemErro id="erro-ticker" texto={erros.ticker} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="data">
                {tipo === "venda" ? "Data da venda *" : "Data da compra *"}
              </Label>
              <Input
                id="data"
                type="date"
                max={HOJE()}
                min={DATA_MINIMA}
                value={data}
                aria-invalid={!!erros.data}
                aria-describedby={erros.data ? "erro-data" : undefined}
                onChange={(e) => {
                  setData(e.target.value);
                  limparErro("data");
                }}
              />
              <MensagemErro id="erro-data" texto={erros.data} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preco">Preço *</Label>
              <Input
                id="preco"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={preco}
                aria-invalid={!!erros.preco}
                aria-describedby={erros.preco ? "erro-preco" : undefined}
                onChange={(e) => {
                  setPreco(e.target.value);
                  limparErro("preco");
                }}
                onBlur={(e) => setPreco(formatarMoeda(e.target.value))}
              />
              <MensagemErro id="erro-preco" texto={erros.preco} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qtd">Quantidade *</Label>
              <Input
                id="qtd"
                inputMode="decimal"
                placeholder="0"
                value={quantidade}
                aria-invalid={!!erros.quantidade}
                aria-describedby={erros.quantidade ? "erro-quantidade" : undefined}
                onChange={(e) => {
                  setQuantidade(e.target.value);
                  limparErro("quantidade");
                }}
              />
              <MensagemErro id="erro-quantidade" texto={erros.quantidade} />
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
                  aria-invalid={!!erros.corretagem}
                  aria-describedby={erros.corretagem ? "erro-corretagem" : undefined}
                  onChange={(e) => {
                    setCorretagem(e.target.value);
                    limparErro("corretagem");
                  }}
                  onBlur={(e) => setCorretagem(formatarMoeda(e.target.value))}
                />
                <MensagemErro id="erro-corretagem" texto={erros.corretagem} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emolumentos">Emolumentos</Label>
                <Input
                  id="emolumentos"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={emolumentos}
                  aria-invalid={!!erros.emolumentos}
                  aria-describedby={erros.emolumentos ? "erro-emolumentos" : undefined}
                  onChange={(e) => {
                    setEmolumentos(e.target.value);
                    limparErro("emolumentos");
                  }}
                  onBlur={(e) => setEmolumentos(formatarMoeda(e.target.value))}
                />
                <MensagemErro id="erro-emolumentos" texto={erros.emolumentos} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impostos">Impostos</Label>
                <Input
                  id="impostos"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={impostos}
                  aria-invalid={!!erros.impostos}
                  aria-describedby={erros.impostos ? "erro-impostos" : undefined}
                  onChange={(e) => {
                    setImpostos(e.target.value);
                    limparErro("impostos");
                  }}
                  onBlur={(e) => setImpostos(formatarMoeda(e.target.value))}
                />
                <MensagemErro id="erro-impostos" texto={erros.impostos} />
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
                  maxLength={60}
                  aria-invalid={!!erros.instituicao}
                  aria-describedby={erros.instituicao ? "erro-instituicao" : undefined}
                  onChange={(e) => {
                    setInstituicao(e.target.value);
                    limparErro("instituicao");
                  }}
                />
                <datalist id="instituicoes">
                  {instituicoesFiltradas.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <MensagemErro id="erro-instituicao" texto={erros.instituicao} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              maxLength={200}
              placeholder="Ex.: aporte mensal de julho"
              value={descricao}
              aria-invalid={!!erros.descricao}
              aria-describedby={erros.descricao ? "erro-descricao" : undefined}
              onChange={(e) => {
                setDescricao(e.target.value);
                limparErro("descricao");
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <MensagemErro id="erro-descricao" texto={erros.descricao} />
              <span className="ml-auto text-[0.7rem] text-muted-foreground">{descricao.length}/200</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Adicionar Transação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
