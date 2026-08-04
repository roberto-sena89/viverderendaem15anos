import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MailCheck, Loader2, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verificar-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirme seu e-mail | Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Confirme seu endereço de e-mail para liberar o acesso ao painel de carteira, dividendos e metas.",
      },
      { property: "og:title", content: "Confirme seu e-mail | Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Verifique sua caixa de entrada e ative sua conta para acessar a plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/verificar-email" }],
  }),
  component: VerifyEmailPage,
});

const COOLDOWN_SEGUNDOS = 60;
const MAX_REENVIOS = 5;

function VerifyEmailPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email ?? "");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [reenvios, setReenvios] = useState(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user?.email && !search.email) setEmail(data.user.email);
      if (data.user?.email_confirmed_at) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.email_confirmed_at) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, search.email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function checkNow() {
    setChecking(true);
    const { data } = await supabase.auth.refreshSession();
    let confirmado = Boolean(data.user?.email_confirmed_at);
    if (!confirmado) {
      const { data: userData } = await supabase.auth.getUser();
      confirmado = Boolean(userData.user?.email_confirmed_at);
    }
    setChecking(false);
    if (confirmado) {
      toast.success("E-mail confirmado! Redirecionando para o painel.");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    toast.info("Ainda não identificamos a confirmação. Verifique sua caixa de entrada e o spam.");
  }

  async function resend() {
    if (!email) {
      toast.error("Informe o e-mail usado no cadastro.");
      return;
    }
    if (cooldown > 0) {
      toast.info(`Aguarde ${cooldown}s para reenviar novamente.`);
      return;
    }
    if (reenvios >= MAX_REENVIOS) {
      toast.error("Limite de reenvios atingido. Tente novamente mais tarde ou fale com o suporte.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/verificar-email` },
    });
    setSending(false);
    if (error) {
      toast.error(
        error.message.includes("rate")
          ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."
          : error.message,
      );
      setCooldown(COOLDOWN_SEGUNDOS);
      return;
    }
    setReenvios((n) => n + 1);
    setCooldown(COOLDOWN_SEGUNDOS);
    toast.success("Novo e-mail de confirmação enviado. Pode levar até 2 minutos para chegar.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {}, replace: true });
  }

  const restantes = MAX_REENVIOS - reenvios;
  const bloqueado = sending || cooldown > 0 || restantes <= 0;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold">Confirme seu e-mail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link de confirmação
          {email ? (
            <>
              {" "}
              para <span className="font-medium text-foreground">{email}</span>
            </>
          ) : null}
          . O acesso ao painel é liberado assim que você confirmar.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Não encontrou? Verifique a caixa de spam ou promoções antes de reenviar.
        </p>

        <div className="mt-8 space-y-3">
          <Button className="w-full" onClick={checkNow} disabled={checking}>
            {checking ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verificando…
              </>
            ) : (
              "Já confirmei, continuar"
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={resend} disabled={bloqueado}>
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Enviando…
              </>
            ) : cooldown > 0 ? (
              `Reenviar em ${cooldown}s`
            ) : (
              <>
                <RefreshCw className="size-4" /> Reenviar e-mail
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {restantes > 0
              ? `Você ainda pode reenviar ${restantes} ${restantes === 1 ? "vez" : "vezes"}.`
              : "Limite de reenvios atingido nesta sessão."}
          </p>
          <Button variant="ghost" className="w-full" onClick={signOut}>
            <LogOut className="size-4" /> Usar outra conta
          </Button>
        </div>
      </div>
    </main>
  );
}

