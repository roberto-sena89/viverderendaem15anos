import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  CreditCard,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme";
import investidorImg from "@/assets/investidor-computador.jpg";
import logoIcone from "@/assets/logo-icone.webp";

const REDIRECT_KEY = "auth:redirect";

function safePath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar | Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Acesse sua conta com Google ou e-mail e senha para acompanhar carteira, dividendos e metas.",
      },
      { property: "og:title", content: "Entrar | Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Acesse sua conta e continue construindo sua independência financeira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://viverderendaem15anos.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 3-2.26 5.54-4.78 7.25l7.73 6c4.51-4.18 7.09-10.36 7.09-17.72z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.29-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const destaques = [
  { titulo: "12+", texto: "classes de ativos" },
  { titulo: "10 anos", texto: "de histórico" },
  { titulo: "R$ 0", texto: "para começar" },
];

const selos = [
  { icone: Gift, texto: "Gratuito para sempre" },
  { icone: ShieldCheck, texto: "Dados protegidos" },
  { icone: CreditCard, texto: "Sem cartão de crédito" },
];

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const destination = safePath(search.redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPassUp, setShowPassUp] = useState(false);

  function goTo(dest: string) {
    navigate({ href: dest, replace: true });
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      if (!data.session.user.email_confirmed_at) {
        navigate({
          to: "/verificar-email",
          search: { email: data.session.user.email ?? undefined },
          replace: true,
        });
        return;
      }
      goTo(destination);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (!session.user.email_confirmed_at) {
          navigate({
            to: "/verificar-email",
            search: { email: session.user.email ?? undefined },
            replace: true,
          });
          return;
        }
        const saved = sessionStorage.getItem(REDIRECT_KEY);
        sessionStorage.removeItem(REDIRECT_KEY);
        goTo(safePath(saved ?? destination));
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [destination, navigate]);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      sessionStorage.setItem(REDIRECT_KEY, destination);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(destination)}`,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com o Google.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      goTo(destination);
    } catch {
      toast.error("Não foi possível entrar com o Google.");
      setLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("not confirmed")
          ? "Confirme seu e-mail para acessar."
          : "E-mail ou senha inválidos.",
      );
      if (error.message.toLowerCase().includes("not confirmed")) {
        navigate({ to: "/verificar-email", search: { email }, replace: true });
      }
      return;
    }
    if (!data.user?.email_confirmed_at) {
      navigate({ to: "/verificar-email", search: { email }, replace: true });
      return;
    }
    toast.success("Bem-vindo de volta!");
    goTo(destination);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verificar-email`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session?.user.email_confirmed_at) {
      goTo(destination);
      return;
    }
    toast.success("Conta criada! Confirme seu e-mail para acessar.");
    navigate({ to: "/verificar-email", search: { email }, replace: true });
  }

  const inputCls =
    "h-11 bg-muted/40 pl-10 transition-colors focus-visible:bg-background";

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <a
        href="#conteudo-auth"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      {/* Painel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-[oklch(0.98_0_0)] lg:flex">
        <img
          src={investidorImg}
          alt="Investidor acompanhando gráficos de ações no computador"
          width={1152}
          height={1440}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/60 to-black/30" />
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-linear-to-br from-primary/25 to-transparent blur-3xl" />

        <div className="relative flex max-w-md items-center gap-3">
          <img
            src={logoIcone}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-xl object-contain"
          />
          <span className="font-display text-[0.95rem] leading-tight font-semibold tracking-[0.16em] uppercase [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
            Viver de renda
            <br />
            <span className="text-primary">em 15 anos</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance [text-shadow:0_2px_16px_rgb(0_0_0/0.6)]">
            Sua independência financeira em um só painel.
          </p>
          <p className="mt-5 text-base leading-relaxed text-[oklch(0.98_0_0)]/85">
            Carteira, aportes, dividendos, rebalanceamento e metas — com projeções de longo prazo.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-3">
            {destaques.map((d) => (
              <div
                key={d.titulo}
                className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md"
              >
                <dt className="font-display text-lg font-semibold">{d.titulo}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-[oklch(0.98_0_0)]/75">
                  {d.texto}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="relative flex flex-wrap gap-x-5 gap-y-2 text-xs text-[oklch(0.98_0_0)]/80">
          {selos.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-center gap-1.5">
              <Icone className="size-3.5 text-primary" aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
      </aside>

      {/* Painel do formulário */}
      <main id="conteudo-auth" className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img
              src={logoIcone}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-xl object-contain"
            />
            <span className="font-display text-[0.8rem] leading-tight font-semibold tracking-[0.16em] uppercase">
              Viver de renda
              <br />
              <span className="text-primary">em 15 anos</span>
            </span>
          </div>

          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] leading-tight font-medium tracking-wide text-primary sm:text-[0.7rem]">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Plataforma premium de investimentos</span>
          </span>

          <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Acesse sua conta
          </h1>
          <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
            Entre com Google ou crie sua conta com e-mail e senha.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full gap-2"
            disabled={loading}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            Continuar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm sm:p-5">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 gap-1">
                <TabsTrigger value="signin" className="min-w-0 truncate px-2 text-xs sm:text-sm">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="min-w-0 truncate px-2 text-xs sm:text-sm">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
                      <Link
                        to="/recuperar-senha"
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="password"
                        type={showPass ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="name"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-up">E-mail</Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="email-up"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-up">Senha</Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="password-up"
                        type={showPassUp ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-describedby="dica-senha"
                        className={`${inputCls} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassUp((v) => !v)}
                        aria-label={showPassUp ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassUp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p id="dica-senha" className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres.
                    </p>
                  </div>

                  <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Criar conta
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
