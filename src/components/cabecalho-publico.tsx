import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import logoIcone from "@/assets/logo-icone.webp";

/**
 * Cabeçalho padrão das páginas públicas de conteúdo.
 * Uma única fonte de verdade para logo, marca, alternador de tema e CTA
 * "Entrar" — evita a divergência que existia entre as páginas.
 */
export function CabecalhoPublico() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Link
          to="/"
          aria-label="Viver de Renda em 15 Anos — página inicial"
          className="flex min-w-0 items-center gap-2.5 rounded-xl"
        >
          <img
            src={logoIcone}
            alt=""
            width={512}
            height={512}
            className="size-9 shrink-0 rounded-xl object-contain"
          />
          <span className="font-brand text-sm leading-[1.15] font-bold text-foreground uppercase">
            Viver de Renda
            <br />
            <span className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground">
              em 15 Anos
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-full px-5 text-xs font-bold">
            <Link to="/auth">
              Entrar <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
