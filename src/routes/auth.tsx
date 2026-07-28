import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import investidorImg from "@/assets/investidor-computador.jpg";


const REDIRECT_KEY = "auth:redirect";

function safePath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
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
      { property: "og:url", content: "https://viverderendaem15.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const destination = safePath(search.redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // `destination` pode conter query string (ex.: consentimento OAuth), então navegamos por href.
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

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-4 border-primary p-12 text-primary-foreground lg:flex">
        <img
          src={investidorImg}
          alt="Investidor acompanhando gráficos de ações no computador"
          width={1024}
          height={1280}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-brand opacity-70" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display font-semibold">Investidor em 15 Anos</span>
        </Link>
        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl leading-tight font-semibold">
            Sua independência financeira em um só painel.
          </h2>
          <p className="mt-4 text-sm opacity-90">
            Carteira, aportes, dividendos, rebalanceamento e metas — com projeções de longo prazo.
          </p>
        </div>
        <p className="relative text-xs opacity-80">Sessão protegida por token JWT.</p>
      </div>


      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">Acesse sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com Google ou com e-mail e senha.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            disabled={loading}
            onClick={signInWithGoogle}
          >
            Continuar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">E-mail</Label>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Senha</Label>
                  <Input
                    id="password-up"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
