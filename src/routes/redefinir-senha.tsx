import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha | Investidor em 15 Anos" },
      {
        name: "description",
        content: "Crie uma nova senha para acessar sua conta Investidor em 15 Anos.",
      },
      { property: "og:title", content: "Definir nova senha | Investidor em 15 Anos" },
      { property: "og:description", content: "Crie uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/redefinir-senha" }],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (data.session) {
        setPronto(true);
        return;
      }
      // O Supabase processa o hash de recuperação de forma assíncrona.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) setPronto(true);
      });
      const timer = setTimeout(() => {
        if (ativo) setSemSessao(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        sub.subscription.unsubscribe();
      };
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha atualizada com sucesso!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold">Definir nova senha</h1>

        {!pronto && semSessao ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Este link de redefinição é inválido ou expirou. Solicite um novo e-mail de
              recuperação.
            </p>
            <Button asChild className="w-full">
              <Link to="/recuperar-senha">Solicitar novo link</Link>
            </Button>
          </div>
        ) : !pronto ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Validando seu link…
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma senha com pelo menos 6 caracteres.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar senha</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  required
                  minLength={6}
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Salvar nova senha"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
