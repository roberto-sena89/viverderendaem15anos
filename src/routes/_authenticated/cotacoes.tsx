import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  head: () => ({
    meta: [
      { title: "Cotações de mercado · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Acompanhe cotações de índices, moedas e ETFs em tempo real e pesquise qualquer ativo da bolsa.",
      },
      { property: "og:title", content: "Cotações de mercado · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Índices, moedas e ETFs atualizados, com busca por ativo e detalhes históricos.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/cotacoes" }],
  }),
  component: Cotacoes,
});

function Cotacoes() {
  return (
    <AppShell
      title="Cotações de mercado"
      description="Índices, moedas e ETFs atualizados, com busca por ativo"
    >
    </AppShell>
  );
}
