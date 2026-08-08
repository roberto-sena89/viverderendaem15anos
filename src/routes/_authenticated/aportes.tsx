import { createFileRoute } from "@tanstack/react-router";
import { AbasCarteira } from "@/components/abas-carteira";
import { EvolucaoPatrimonio } from "@/components/evolucao-patrimonio";
import { AppShell } from "@/components/app-shell";
import { useAportes } from "@/lib/data";
import { brl } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/aportes")({
  head: () => ({
    meta: [
      { title: "Patrimônio · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Registre e acompanhe todos os seus aportes por data, corretora, ativo, quantidade e taxas.",
      },
      { property: "og:title", content: "Patrimônio · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Histórico completo de aportes da sua carteira de investimentos.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/aportes" }],
  }),
  component: AportesPage,
});

function AportesPage() {
  const { data: aportes = [] } = useAportes();

  const mesRef = aportes[0]?.data.slice(0, 7) ?? "";
  const totalMes = aportes
    .filter((a) => a.data.startsWith(mesRef))
    .reduce((s, a) => s + a.quantidade * a.preco + a.taxas, 0);

  return (
    <AppShell title="Patrimônio" description={`Último mês registrado: ${brl(totalMes)}`}>
      <AbasCarteira />

      <EvolucaoPatrimonio />
    </AppShell>
  );
}
