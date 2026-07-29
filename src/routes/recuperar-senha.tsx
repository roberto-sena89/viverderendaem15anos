import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      { rel: "canonical", href: "https://viverderendaem15anos.lovable.app/recuperar-senha" },
    ],
  }),
  component: RecuperarSenhaPage,
});

const ESPERA_SEGUNDOS = 60;

function mascararEmail(valor: string) {
  const [usuario, dominio] = valor.trim().split("@");
  if (!usuario || !dominio) return valor;
  const visivel =
    usuario.length <= 2 ? usuario.slice(0, 1) : usuario.slice(0, 2);
  const oculto = "•".repeat(Math.max(usuario.length - visivel.length, 2));

  const partes = dominio.split(".");
  const nome = partes[0] ?? "";
  const resto = partes.slice(1).join(".");
  const nomeVisivel = nome.slice(0, 1);
  const nomeOculto = "•".repeat(Math.max(nome.length - 1, 2));

  return `${visivel}${oculto}@${nomeVisivel}${nomeOculto}${resto ? `.${resto}` : ""}`;
}

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const timer = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [espera]);

  async function enviarEmail(destino: string) {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(destino, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("rate")
          ? "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo."
          : "Não foi possível enviar o e-mail de recuperação. Tente novamente.",
      );
      return;
    }
    setEnviado(true);
    setEspera(ESPERA_SEGUNDOS);
    toast.success("E-mail enviado! Verifique sua caixa de entrada.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await enviarEmail(email);
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

        <h1 className="font-display mt-6 text-2xl font-semibold">
          {enviado ? "E-mail enviado" : "Esqueci minha senha"}
        </h1>

        {enviado ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de redefinição para{" "}
                  <strong className="text-foreground">{mascararEmail(email)}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Próximo passo: abra esse e-mail e clique em “Redefinir senha”.
                </p>
              </div>
            </div>


            <div>
              <p className="text-sm font-medium">Próximos passos</p>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                {[
                  "Abra o e-mail que acabamos de enviar (verifique também spam e promoções).",
                  "Clique no botão “Redefinir senha” — o link é válido por tempo limitado.",
                  "Crie uma nova senha com pelo menos 6 caracteres e entre na sua conta.",
                ].map((passo, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{passo}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                disabled={loading || espera > 0}
                onClick={() => enviarEmail(email)}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : espera > 0 ? (
                  `Reenviar em ${espera}s`
                ) : (
                  "Reenviar e-mail"
                )}
              </Button>
              <Button asChild className="w-full">
                <Link to="/auth">Voltar ao login</Link>
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setEnviado(false)}
              >
                Usar outro e-mail
              </button>
            </div>
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
