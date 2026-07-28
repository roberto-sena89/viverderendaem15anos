import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Wallet,
  PlusCircle,
  Coins,
  LineChart,
  Scale,
  Target,
  Sparkles,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/carteira", label: "Carteira", icon: Wallet },
  { to: "/aportes", label: "Aportes", icon: PlusCircle },
  { to: "/dividendos", label: "Dividendos", icon: Coins },
  { to: "/planejador", label: "Planejador FI", icon: LineChart },
  { to: "/rebalanceamento", label: "Rebalanceamento", icon: Scale },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-sm leading-tight font-semibold text-sidebar-foreground">
            Investidor
            <br />
            <span className="text-muted-foreground">em 15 Anos</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-sidebar-border p-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">RT</AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-sidebar-foreground">Investidor</p>
            <p className="truncate text-muted-foreground">Perfil moderado</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
              {description ? (
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <ThemeToggle />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  pathname === to
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="animate-rise flex-1 space-y-6 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
