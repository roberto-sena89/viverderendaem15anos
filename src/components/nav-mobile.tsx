import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Menu, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoIcone from "@/assets/logo-icone.webp";
import { useBreakpoint } from "@/hooks/use-breakpoint";

export type ItemNav = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export type GrupoNav = { titulo: string; itens: ItemNav[] };

/**
 * Menu drawer de navegação para telas pequenas (< lg).
 * Alvos de toque de 44px, fecha ao navegar e reflete a rota ativa.
 * Otimizado para smartwatch (320px), mobile (768px), tablet (1024px).
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
  const breakpoint = useBreakpoint();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  const iniciais = (usuario?.name ?? "IN")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  // Configuração adaptativa por breakpoint
  const responsiveConfig = {
    watch: {
      triggerSize: "size-10",
      triggerIconSize: "size-4",
      contentWidth: "w-[80vw]",
      headerPadding: "p-2",
      headerLogoSize: "size-8",
      headerFontSize: "text-[0.68rem]",
      navGap: "gap-1",
      navPadding: "p-2",
      itemPadding: "px-2 py-1.5",
      itemFontSize: "text-[0.7rem]",
      itemIconSize: "size-4",
      footerPadding: "p-2",
      footerFontSize: "text-[0.65rem]",
      avatarSize: "size-8",
      logoutButtonSize: "size-9",
    },
    mobile: {
      triggerSize: "size-11",
      triggerIconSize: "size-5",
      contentWidth: "w-[min(18rem,85vw)]",
      headerPadding: "p-3",
      headerLogoSize: "size-9",
      headerFontSize: "text-[0.75rem]",
      navGap: "gap-2",
      navPadding: "p-3",
      itemPadding: "px-3 py-2",
      itemFontSize: "text-[0.8125rem]",
      itemIconSize: "size-[17px]",
      footerPadding: "p-3",
      footerFontSize: "text-xs",
      avatarSize: "size-9",
      logoutButtonSize: "size-11",
    },
    tablet: {
      triggerSize: "size-12",
      triggerIconSize: "size-6",
      contentWidth: "w-[min(20rem,86vw)]",
      headerPadding: "p-4",
      headerLogoSize: "size-10",
      headerFontSize: "text-sm",
      navGap: "gap-3",
      navPadding: "p-4",
      itemPadding: "px-4 py-2.5",
      itemFontSize: "text-[0.875rem]",
      itemIconSize: "size-5",
      footerPadding: "p-4",
      footerFontSize: "text-sm",
      avatarSize: "size-10",
      logoutButtonSize: "size-12",
    },
  };

  // Seleciona configuração baseada no breakpoint
  const config =
    breakpoint === "watch"
      ? responsiveConfig.watch
      : breakpoint === "mobile"
        ? responsiveConfig.mobile
        : responsiveConfig.tablet;

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu de navegação"
          className={`${config.triggerSize} shrink-0 lg:hidden`}
        >
          <Menu className={config.triggerIconSize} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className={`flex ${config.contentWidth} flex-col gap-0 bg-sidebar/95 p-0 backdrop-blur-xl`}
      >
        <SheetHeader className={`border-b border-sidebar-border ${config.headerPadding}`}>
          <SheetTitle className="flex items-center gap-2 text-left sm:gap-3">
            <img
              src={logoIcone}
              alt=""
              width={512}
              height={512}
              className={`${config.headerLogoSize} shrink-0 rounded-xl object-contain`}
            />
            <span
              className={`font-brand ${config.headerFontSize} leading-[1.15] font-bold uppercase`}
            >
              VIVER DE RENDA
              <br />
              <span
                className={`font-brand text-[0.6rem] sm:text-xs font-semibold tracking-[0.1em] text-muted-foreground`}
              >
                EM 15 ANOS
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav
          className={`scrollbar-none flex min-h-0 flex-1 flex-col ${config.navGap} overflow-y-auto overscroll-contain ${config.navPadding}`}
        >
          {grupos.map((grupo, i) => (
            <div
              key={grupo.titulo}
              className={i > 0 ? "border-t border-sidebar-border pt-2 sm:pt-3" : ""}
            >
              <p
                className={`mb-1 px-2 sm:px-3 ${config.headerFontSize} leading-none font-semibold tracking-[0.16em] text-muted-foreground uppercase`}
              >
                {grupo.titulo}
              </p>
              <div className={`flex flex-col ${config.navGap}`}>
                {grupo.itens.map(({ to, label, icon: Icon }) => {
                  const ativo = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-2 rounded-lg ${config.itemPadding} ${config.itemFontSize} transition-colors ${
                        ativo
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "font-medium text-muted-foreground active:bg-sidebar-accent/60"
                      }`}
                    >
                      <Icon
                        className={`${config.itemIconSize} shrink-0 ${ativo ? "text-primary" : ""}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={`flex items-center gap-2 border-t border-sidebar-border ${config.footerPadding} sm:gap-3`}
        >
          <Avatar className={config.avatarSize}>
            {usuario?.avatar ? <AvatarImage src={usuario.avatar} alt="" /> : null}
            <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
              {iniciais || "IN"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-medium text-sidebar-foreground ${config.footerFontSize}`}>
              {usuario?.name ?? "Investidor"}
            </p>
            <p className={`truncate text-muted-foreground ${config.footerFontSize}`}>
              {usuario?.email ?? ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            onClick={onSair}
            className={`${config.logoutButtonSize} shrink-0 text-muted-foreground`}
          >
            <LogOut className={config.triggerIconSize} />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
