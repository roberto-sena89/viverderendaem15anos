import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "enviando" | "ok" | "erro";

export function FormularioNewsletter({ origem = "site" }: { origem?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function assinar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "enviando") return;
    setStatus("enviando");
    try {
      const resposta = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fonte: origem }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { ok?: boolean };
      if (!resposta.ok || !corpo.ok) {
        setStatus("erro");
        return;
      }
      trackEvent("newsletter_inscrito", { origem });
      setStatus("ok");
    } catch {
      setStatus("erro");
    }
  }

  if (status === "ok") {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-500">
        <Check className="size-4" />
        <span>Inscrição confirmada! Enviamos o primeiro guia em breve.</span>
      </div>
    );
  }

  return (
    <form onSubmit={assinar} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor={`newsletter-${origem}`}>
        Seu melhor e-mail
      </label>
      <Input
        id={`newsletter-${origem}`}
        type="email"
        required
        placeholder="Seu melhor e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 flex-1"
      />
      <Button type="submit" disabled={status === "enviando"} className="h-11">
        {status === "enviando" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {status === "enviando" ? "Enviando…" : "Receber o guia grátis"}
      </Button>
      {status === "erro" && (
        <p className="text-sm text-destructive">Não foi possível assinar. Tente novamente.</p>
      )}
      <p className="sr-only" aria-live="polite">
        {status === "erro" ? "Não foi possível assinar. Tente novamente." : ""}
      </p>
    </form>
  );
}
