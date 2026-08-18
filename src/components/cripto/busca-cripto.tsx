import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextoTruncado } from "@/components/texto-truncado";
import type { LinhaCripto } from "@/lib/cripto-base";

const LIMITE = 8;

/** Ordena as sugestões: ticker exato, prefixo de ticker, prefixo de nome, resto. */
function pontuar(l: LinhaCripto, termo: string) {
  const t = l.ticker.toLowerCase();
  const n = l.nome.toLowerCase();
  if (t === termo) return 0;
  if (t.startsWith(termo)) return 1;
  if (n.startsWith(termo)) return 2;
  if (t.includes(termo)) return 3;
  if (n.includes(termo)) return 4;
  return 5;
}

/**
 * Campo de busca com autocomplete das criptomoedas carregadas na grade.
 * Digitar filtra a grade; escolher uma sugestão abre o detalhe do ativo.
 */
export function BuscaCripto({
  valor,
  linhas,
  onChange,
  onEscolher,
}: {
  valor: string;
  linhas: LinhaCripto[];
  onChange: (v: string) => void;
  onEscolher: (l: LinhaCripto) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const listaId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const opcoesRef = useRef<Array<HTMLLIElement | null>>([]);

  const termo = valor.trim().toLowerCase();

  const sugestoes = useMemo(() => {
    if (termo.length < 1) return [];
    return linhas
      .filter((l) => `${l.ticker} ${l.nome}`.toLowerCase().includes(termo))
      .sort((a, b) => pontuar(a, termo) - pontuar(b, termo) || (a.rank ?? 9999) - (b.rank ?? 9999))
      .slice(0, LIMITE);
  }, [linhas, termo]);

  useEffect(() => setDestaque(0), [termo]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const mostrar = aberto && sugestoes.length > 0;

  // Mantém a opção destacada visível ao navegar com as setas
  useEffect(() => {
    if (!mostrar) return;
    opcoesRef.current[destaque]?.scrollIntoView({ block: "nearest" });
  }, [destaque, mostrar]);

  function escolher(l: LinhaCripto) {
    onEscolher(l);
    setAberto(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative flex-1 sm:w-56 sm:flex-none lg:w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrar && sugestoes[destaque] ? `${listaId}-${destaque}` : undefined
        }
        autoComplete="off"
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => {
          // Esc: 1º fecha as sugestões, 2º limpa o campo (foco permanece na busca)
          if (e.key === "Escape") {
            e.preventDefault();
            if (mostrar) setAberto(false);
            else if (valor) onChange("");
            return;
          }
          if (e.key === "Tab") return setAberto(false);
          if (!mostrar) {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && sugestoes.length > 0) {
              e.preventDefault();
              setAberto(true);
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setDestaque((d) => (d + 1) % sugestoes.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setDestaque((d) => (d - 1 + sugestoes.length) % sugestoes.length);
          } else if (e.key === "Home") {
            e.preventDefault();
            setDestaque(0);
          } else if (e.key === "End") {
            e.preventDefault();
            setDestaque(sugestoes.length - 1);
          } else if (e.key === "Enter" && sugestoes[destaque]) {
            e.preventDefault();
            escolher(sugestoes[destaque]);
          }
        }}
        placeholder="Pesquisar ativo (nome ou ticker)"
        aria-label="Pesquisar criptomoeda"
        className="h-8 w-full rounded-lg border border-border bg-background pr-7 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
      />
      {valor ? (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            onChange("");
            setAberto(false);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
        >
          <X className="size-3" />
        </button>
      ) : null}

      {mostrar ? (
        <div className="absolute z-50 mt-1 w-full min-w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <ul
            id={listaId}
            role="listbox"
            aria-label="Criptomoedas encontradas"
            className="max-h-72 overflow-y-auto py-1"
          >
            {sugestoes.map((l, i) => (
              <li
                key={l.id}
                id={`${listaId}-${i}`}
                ref={(el) => {
                  opcoesRef.current[i] = el;
                }}
                role="option"
                aria-selected={i === destaque}
                onMouseEnter={() => setDestaque(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(l);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs",
                  i === destaque && "bg-muted ring-1 ring-primary/50 ring-inset",
                )}
              >
                {l.imagem ? (
                  <img
                    src={l.imagem}
                    alt=""
                    loading="lazy"
                    className="size-5 shrink-0 rounded-full"
                  />
                ) : (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[0.6rem] font-semibold">
                    {l.ticker.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <TextoTruncado as="span" className="t-ticker block" texto={l.ticker} passivo>
                    {l.ticker}
                  </TextoTruncado>
                  <TextoTruncado as="span" className="t-subtexto block" texto={l.nome} passivo>
                    {l.nome}
                  </TextoTruncado>
                </span>
                {l.rank ? (
                  <span className="shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
                    #{l.rank}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Anúncio para leitores de tela sobre a quantidade de sugestões */}
      <span aria-live="polite" className="sr-only">
        {termo.length > 0
          ? sugestoes.length > 0
            ? `${sugestoes.length} sugestão(ões) disponível(is). Use as setas para navegar e Enter para abrir.`
            : "Nenhuma sugestão encontrada."
          : ""}
      </span>
    </div>
  );
}
