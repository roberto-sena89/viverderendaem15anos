import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { procurarAtivos, type SugestaoAtivo } from "@/lib/market.functions";

/**
 * Autocomplete de ativos alimentado pela B3 (Yahoo Finance) e pelo Tesouro
 * Transparente. Basta digitar a primeira letra para ver as sugestões.
 */
export function BuscaAtivo({
  id,
  valor,
  categoria,
  desabilitado,
  invalido,
  descreveErro,
  onChange,
  onSelecionar,
}: {
  id: string;
  valor: string;
  categoria: string;
  desabilitado?: boolean;
  invalido?: boolean;
  descreveErro?: string;
  onChange: (v: string) => void;
  onSelecionar: (s: SugestaoAtivo) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [destaque, setDestaque] = useState(0);
  const listaId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const buscar = useServerFn(procurarAtivos);

  // debounce de 300 ms sobre o texto digitado
  useEffect(() => {
    const t = setTimeout(() => setTermo(valor.trim()), 300);
    return () => clearTimeout(t);
  }, [valor]);

  const { data: sugestoes = [], isFetching } = useQuery({
    queryKey: ["busca-ativo", termo, categoria],
    queryFn: () => buscar({ data: { termo, categoria } }),
    enabled: aberto && termo.length >= 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => setDestaque(0), [sugestoes]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  function escolher(s: SugestaoAtivo) {
    onSelecionar(s);
    setAberto(false);
  }

  const mostrarLista = aberto && valor.trim().length >= 1;

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrarLista && sugestoes[destaque] ? `${listaId}-${destaque}` : undefined
        }
        autoComplete="off"
        className="pl-9 uppercase"
        placeholder={categoria ? "Digite a 1ª letra: BBAS3, Tesouro..." : "Selecione uma categoria"}
        disabled={desabilitado}
        value={valor}
        aria-invalid={invalido}
        aria-describedby={descreveErro}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => {
          if (!mostrarLista) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setDestaque((d) => Math.min(d + 1, sugestoes.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setDestaque((d) => Math.max(d - 1, 0));
          } else if (e.key === "Enter" && sugestoes[destaque]) {
            e.preventDefault();
            escolher(sugestoes[destaque]);
          } else if (e.key === "Escape") {
            setAberto(false);
          }
        }}
      />

      {mostrarLista && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          <ul id={listaId} role="listbox" aria-label="Ativos encontrados" className="max-h-72 overflow-y-auto">
            {sugestoes.map((s, i) => (
              <li
                key={s.ticker}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === destaque}
                onMouseEnter={() => setDestaque(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(s);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                  i === destaque && "bg-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{s.ticker}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.nome}</span>
                </span>
                <span className="shrink-0 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  {s.fonte}
                </span>
              </li>
            ))}
            {sugestoes.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                {isFetching ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Buscando na B3 e no Tesouro...
                  </>
                ) : (
                  "Nenhum ativo encontrado. Você pode digitar o código manualmente."
                )}
              </li>
            )}
          </ul>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {mostrarLista && !isFetching ? `${sugestoes.length} ativos encontrados` : ""}
      </span>
    </div>
  );
}
