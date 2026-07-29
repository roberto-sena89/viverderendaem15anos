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
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
