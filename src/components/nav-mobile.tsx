import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Menu, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoIcone from "@/assets/logo-icone.webp";

export type ItemNav = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export type GrupoNav = { titulo: string; itens: ItemNav[] };

/**
 * Menu drawer de navegação para telas pequenas (< lg).
 * Alvos de toque de 44px, fecha ao navegar e reflete a rota ativa.
 */
export function NavMobile({
  grupos,
  usuario,
  onSair,
}: {
  grupos: GrupoNav[];
  usuario?: { name: string; email: string; avatar?: string } | null;
  onSair: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  const iniciais = (usuario?.name ?? "IN")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu de navegação"
          className="size-11 shrink-0 lg:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-[min(20rem,86vw)] flex-col gap-0 bg-sidebar/95 p-0 backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-sidebar-border p-4">
          <SheetTitle className="flex items-center gap-3 text-left">
            <img
              src={logoIcone}
              alt=""
              width={512}
              height={512}
              className="size-9 shrink-0 rounded-xl object-contain"
            />
            <span className="font-brand text-sm leading-[1.15] font-bold uppercase">
              VIVER DE RENDA
              <br />
              <span className="font-brand text-xs font-semibold tracking-[0.1em] text-muted-foreground">
                EM 15 ANOS
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
          {grupos.map((grupo, i) => (
            <div key={grupo.titulo} className={i > 0 ? "border-t border-sidebar-border pt-3" : ""}>
              <p className="mb-1 px-3 text-[0.68rem] leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {grupo.titulo}
              </p>
              <div className="flex flex-col">
                {grupo.itens.map(({ to, label, icon: Icon }) => {
                  const ativo = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-[0.8125rem] transition-colors ${
                        ativo
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "font-medium text-muted-foreground active:bg-sidebar-accent/60"
                      }`}
                    >
                      <Icon className={`size-[17px] shrink-0 ${ativo ? "text-primary" : ""}`} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-sidebar-border p-3">
          <Avatar className="size-9 shrink-0">
            {usuario?.avatar ? <AvatarImage src={usuario.avatar} alt="" /> : null}
            <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
              {iniciais || "IN"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium text-sidebar-foreground">
              {usuario?.name ?? "Investidor"}
            </p>
            <p className="truncate text-muted-foreground">{usuario?.email ?? ""}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            onClick={onSair}
            className="size-11 shrink-0 text-muted-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
