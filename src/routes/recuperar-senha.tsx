import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Receba um link por e-mail para redefinir a senha da sua conta Investidor em 15 Anos.",
      },
      { property: "og:title", content: "Recuperar senha | Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Enviamos um link seguro para você criar uma nova senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://viverderendaem15.lovable.app/recuperar-senha" },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
      return;
    }
    setEnviado(true);
    toast.success("E-mail enviado! Verifique sua caixa de entrada.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao login
        </Link>

        <h1 className="font-display mt-6 text-2xl font-semibold">Esqueci minha senha</h1>

        {enviado ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <MailCheck className="mt-0.5 size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Enviamos um link de redefinição para <strong className="text-foreground">{email}</strong>.
                O link expira em pouco tempo — confira também a pasta de spam.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setEnviado(false)}>
              Enviar novamente
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-reset">E-mail</Label>
                <Input
                  id="email-reset"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar link de redefinição"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
