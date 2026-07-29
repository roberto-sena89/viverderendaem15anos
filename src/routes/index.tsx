import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Viver de Renda em 15 Anos — Carteira e Renda Passiva" },
      {
        name: "description",
        content:
          "Plataforma para controlar carteira, dividendos e projetar a sua independência financeira.",
      },
      { property: "og:title", content: "Viver de Renda em 15 Anos — Carteira e Renda Passiva" },
      {
        property: "og:description",
        content: "Controle sua carteira, acompanhe dividendos e projete sua liberdade financeira.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://viverderendaem15anos.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/" }],
  }),
  component: () => null,
});
