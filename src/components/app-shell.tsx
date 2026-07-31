import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Coins,
  LineChart,
  Scale,
  Target,
  CandlestickChart,
  Trophy,
  BarChart3,
  ListOrdered,

  Bot,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme";


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SECOES, secaoPorRota } from "@/lib/navegacao";
import logoIcone from "@/assets/logo-icone.webp";



const ICONES: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/carteira": Wallet,
  "/aportes": PiggyBank,
  "/historico-aportes": ListOrdered,
  "/carteira-recomendada": Sparkles,
  "/dividendos": Coins,
  "/rebalanceamento": Scale,
  "/cotacoes": BarChart3,
  "/rankings": Trophy,
  "/mercado": CandlestickChart,
  "/auditoria": ShieldCheck,
  "/planejador": LineChart,
  "/metas": Target,
  "/chat": Bot,
};

const grupos = ["Carteira", "MERCADO", "Planejamento"].map((titulo) => ({
  titulo,
  itens: SECOES.filter((s) => s.grupo === titulo).map((s) => ({
    to: s.to,
    label: s.rotulo,
    icon: ICONES[s.to] ?? LayoutDashboard,
  })),
}));

const nav = grupos.flatMap((g) => g.itens);




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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      setUser({
        name: (meta.full_name as string) || (meta.name as string) || "Investidor",
        email: data.user.email ?? "",
        avatar: meta.avatar_url as string | undefined,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true, search: { redirect: undefined } });
  }

  const secaoAtual = secaoPorRota(pathname);
  const grupoAtual = secaoAtual?.grupo ?? "Investidor em 15 anos";
  // O h1 sempre reflete o rótulo da aba selecionada.
  const tituloPagina = secaoAtual?.rotulo ?? title;


  const initials = (user?.name ?? "IN")

    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/" className="mb-7 flex items-center gap-3 px-1">
          <img
            src={logoIcone}
            alt="Viver de Renda em 15 Anos"
            width={512}
            height={512}
            className="size-10 shrink-0 rounded-xl object-contain"
          />

          <span className="font-brand text-base leading-[1.15] font-bold text-sidebar-foreground uppercase">
            VIVER DE RENDA
            <br />
            <span className="font-brand text-sm font-semibold tracking-[0.1em] text-muted-foreground">
              EM 15 ANOS
            </span>
          </span>
        </Link>


        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          {grupos.map((grupo, i) => (
            <div key={grupo.titulo} className={i > 0 ? "border-t border-sidebar-border pt-5" : ""}>
              <p className="mb-2 px-3 text-[0.82rem] leading-none font-semibold tracking-[0.16em] text-muted-foreground/80 uppercase">
                {grupo.titulo}
              </p>
              <div className="flex flex-col gap-0.5">
                {grupo.itens.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex min-h-11 items-center gap-3 rounded-lg py-2.5 pr-3 pl-4 text-[0.875rem] leading-none transition-colors lg:min-h-10 ${
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      {active ? (
                        <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-gradient-brand" />
                      ) : null}
                      <Icon
                        className={`size-[18px] shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"}`}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>



        <div className="mt-6 flex items-center gap-3 rounded-xl border border-sidebar-border p-3">
          <Avatar className="size-9">
            {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
            <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
              {initials || "IN"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium text-sidebar-foreground">
              {user?.name ?? "Investidor"}
            </p>
            <p className="truncate text-muted-foreground">{user?.email ?? "Perfil moderado"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            onClick={handleSignOut}
            className="size-8 shrink-0 text-muted-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4 lg:px-8 lg:py-5">
            <div className="min-w-0 space-y-1">
              <nav aria-label="Trilha de navegação">
                <ol className="flex min-w-0 items-center gap-1.5 text-[0.78rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  <li className="hidden sm:block">
                    <Link to="/" className="transition-colors hover:text-foreground">
                      Início
                    </Link>
                  </li>
                  <li aria-hidden="true" className="hidden text-border sm:block">
                    /
                  </li>
                  <li className="shrink-0">{grupoAtual}</li>
                  {secaoAtual ? (
                    <>
                      <li aria-hidden="true" className="text-border">
                        /
                      </li>
                      <li className="truncate text-foreground">{secaoAtual.rotulo}</li>
                    </>
                  ) : null}
                </ol>
              </nav>
              <h1 className="truncate font-display text-xl leading-tight font-bold tracking-tight sm:text-2xl">
                {tituloPagina}
              </h1>
              {description ? (
                <p className="line-clamp-2 max-w-2xl text-xs leading-snug text-muted-foreground sm:text-sm">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sair da conta"
                onClick={handleSignOut}
                className="lg:hidden"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>

          <nav className="flex max-w-full min-w-0 gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs transition-colors ${
                  pathname === to
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <main
          id="conteudo"
          className="animate-rise mx-auto w-full min-w-0 max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-5 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
