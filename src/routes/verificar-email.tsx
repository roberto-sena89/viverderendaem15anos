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
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email ?? "");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

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

  async function checkNow() {
    setChecking(true);
    const { data } = await supabase.auth.refreshSession();
    if (!data.user) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.email_confirmed_at) {
        navigate({ to: "/dashboard", replace: true });
        setChecking(false);
        return;
      }
    }
    setChecking(false);
    if (data.user?.email_confirmed_at) {
      toast.success("E-mail confirmado!");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    toast.info("Ainda não identificamos a confirmação. Verifique sua caixa de entrada.");
  }

  async function resend() {
    if (!email) {
      toast.error("Informe o e-mail usado no cadastro.");
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
      toast.error(error.message);
      return;
    }
    toast.success("Novo e-mail de confirmação enviado.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 py-12">
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

        <div className="mt-8 space-y-3">
          <Button className="w-full" onClick={checkNow} disabled={checking}>
            {checking ? <Loader2 className="size-4 animate-spin" /> : "Já confirmei, continuar"}
          </Button>
          <Button variant="outline" className="w-full" onClick={resend} disabled={sending}>
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="size-4" /> Reenviar e-mail
              </>
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={signOut}>
            <LogOut className="size-4" /> Usar outra conta
          </Button>
        </div>
      </div>
    </div>
  );
}
