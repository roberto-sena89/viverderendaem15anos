import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Coins,
  LineChart,
  Scale,
  Target,
  Trophy,
  BarChart3,
  ListOrdered,
  FileUp,
  Newspaper,
  Bot,
  Radar,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SinoAlertas } from "@/components/sino-alertas";
import { NavMobile } from "@/components/nav-mobile";

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
  "/importar": FileUp,
  "/dividendos": Coins,
  "/rebalanceamento": Scale,
  "/cotacoes": BarChart3,
  "/rankings": Trophy,
  "/noticias": Newspaper,
  "/radar": Radar,
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

  // Publica a altura real do cabeçalho para que blocos fixos das páginas
  // (ex.: barra de cotações) fiquem logo abaixo dele, sem sobreposição.
  const cabecalhoRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = cabecalhoRef.current;
    if (!el) return;
    const aplicar = () =>
      document.documentElement.style.setProperty(
        "--altura-cabecalho-app",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    aplicar();
    const ro = new ResizeObserver(aplicar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Recolhimento da barra lateral (persistido e automático em telas baixas/estreitas).
  const [recolhida, setRecolhida] = useState(false);
  useEffect(() => {
    const salvo = window.localStorage.getItem("sidebar-recolhida");
    if (salvo != null) setRecolhida(salvo === "1");
    else setRecolhida(window.matchMedia("(max-width: 1279px)").matches);
  }, []);
  function alternarSidebar() {
    setRecolhida((v) => {
      window.localStorage.setItem("sidebar-recolhida", v ? "0" : "1");
      return !v;
    });
  }

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
    <div className="min-h-dvh bg-background lg:flex">
      <a href="#conteudo" className="link-pular">
        Pular para o conteúdo
      </a>
      <aside
        data-recolhida={recolhida ? "true" : "false"}
        className={`sticky top-0 z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar py-3 transition-[width] duration-200 lg:flex ${
          recolhida ? "w-[4.5rem] px-2" : "w-64 px-3"
        }`}
      >
        <Link
          to="/"
          className={`mb-3 flex shrink-0 items-center gap-2.5 ${recolhida ? "justify-center px-0" : "px-1"}`}
        >
          <img
            src={logoIcone}
            alt="Viver de Renda em 15 Anos"
            width={512}
            height={512}
            className="size-9 shrink-0 rounded-xl object-contain"
          />

          {!recolhida && (
            <span className="font-brand text-sm leading-[1.15] font-bold text-sidebar-foreground uppercase">
              VIVER DE RENDA
              <br />
              <span className="font-brand text-xs font-semibold tracking-[0.1em] text-muted-foreground">
                EM 15 ANOS
              </span>
            </span>
          )}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={alternarSidebar}
          aria-label={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!recolhida}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          className={`mb-2 size-8 shrink-0 text-muted-foreground ${recolhida ? "self-center" : "self-end"}`}
        >
          {recolhida ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>

        <nav className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
          {grupos.map((grupo, i) => (
            <div key={grupo.titulo} className={i > 0 ? "border-t border-sidebar-border pt-2" : ""}>
              {!recolhida && (
                <p className="mb-1 px-3 text-[0.68rem] leading-none font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {grupo.titulo}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {grupo.itens.map(({ to, label, icon: Icon }) => {
                  // Sincroniza o estado ativo com o pathname real.
                  // Se o usuário estiver em /, tratamos como /dashboard para fins de navegação lateral
                  // se o usuário estiver autenticado (o redirecionamento cuida disso no TanStack Router).
                  const active = pathname === to || (to === "/dashboard" && pathname === "/");
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? "page" : undefined}
                      title={label}
                      className={`group relative flex min-h-11 items-center gap-2.5 rounded-lg py-1.5 text-[0.82rem] leading-none transition-colors lg:min-h-8 ${
                        recolhida ? "justify-center px-0" : "pr-3 pl-4"
                      } ${
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      {active && !recolhida ? (
                        <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-gradient-brand" />
                      ) : null}
                      <Icon
                        className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"}`}
                      />
                      <span className={recolhida ? "sr-only" : "truncate"}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={`mt-2.5 flex shrink-0 items-center gap-2.5 rounded-xl border border-sidebar-border p-2 ${
            recolhida ? "flex-col" : ""
          }`}
        >
          <Avatar className="size-9">
            {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
            <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
              {initials || "IN"}
            </AvatarFallback>
          </Avatar>
          {!recolhida && (
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-medium text-sidebar-foreground">
                {user?.name ?? "Investidor"}
              </p>
              <p className="truncate text-muted-foreground">{user?.email ?? "Perfil moderado"}</p>
            </div>
          )}
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
        <header
          ref={cabecalhoRef}
          className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl"
        >
          <div className="container-app grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="lg:hidden">
              <NavMobile grupos={grupos} usuario={user} onSair={handleSignOut} />
            </div>

            <div className="min-w-0 space-y-1">
              <nav aria-label="Trilha de navegação">
                <ol className="flex min-w-0 items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:text-[0.78rem]">
                  <li className="hidden sm:block">
                    <Link to="/" className="transition-colors hover:text-foreground">
                      Início
                    </Link>
                  </li>
                  <li aria-hidden="true" className="hidden text-border sm:block">
                    /
                  </li>
                  <li className="hidden shrink-0 sm:block">{grupoAtual}</li>
                  {secaoAtual ? (
                    <>
                      <li aria-hidden="true" className="hidden text-border sm:block">
                        /
                      </li>
                      <li className="truncate text-foreground">{secaoAtual.rotulo}</li>
                    </>
                  ) : null}
                </ol>
              </nav>
              <h1 className="t-h1 truncate">{tituloPagina}</h1>

              {description ? (
                <p className="t-body-sm line-clamp-2 hidden max-w-2xl text-muted-foreground sm:block">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1 self-center">
              <SinoAlertas />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main
          id="conteudo"
          className="animate-rise container-app min-w-0 flex-1 space-y-6 py-6 sm:space-y-8 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
