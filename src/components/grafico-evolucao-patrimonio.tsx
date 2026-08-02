import { useState } from "react";
import { Calendar, CircleDollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/panel";
import { TooltipEvolucao } from "@/components/tooltip-evolucao";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAportes, useAtivos } from "@/lib/data";
import { brl, categorias, evolucaoPatrimonio, resumoCarteira } from "@/lib/portfolio";

const PERIODOS = [
  { valor: "inicio", rotulo: "Desde o início" },
  { valor: "12", rotulo: "12 Meses" },
  { valor: "24", rotulo: "2 Anos" },
  { valor: "60", rotulo: "5 Anos" },
  { valor: "120", rotulo: "10 Anos" },
  { valor: "custom", rotulo: "Data personalizada" },
];

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "13px",
};

function FiltroSelect({
  valor,
  onChange,
  icone: Icone,
  opcoes,
  rotuloAcessivel,
}: {
  valor: string;
  onChange: (v: string) => void;
  icone: typeof Calendar;
  opcoes: { valor: string; rotulo: string }[];
  rotuloAcessivel: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={rotuloAcessivel} className="h-9 w-[9.5rem] gap-2 text-xs">
        <Icone className="size-8! shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor} className="text-xs">
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Painel de evolução do patrimônio (barras empilhadas) com filtros de período e tipo. */
export function GraficoEvolucaoPatrimonio() {
  const { data: ativos = [] } = useAtivos();
  const { data: aportes = [] } = useAportes();

  const [periodo, setPeriodo] = useState("12");
  const [inicioCustom, setInicioCustom] = useState("");
  const [fimCustom, setFimCustom] = useState("");
  const [tipo, setTipo] = useState("todos");

  const opcoesTipo = [
    { valor: "todos", rotulo: "Todos os tipos" },
    ...categorias.map((c) => ({ valor: c, rotulo: c })),
  ];

  const ativosFiltrados = tipo === "todos" ? ativos : ativos.filter((a) => a.categoria === tipo);
  const resumo = resumoCarteira(ativosFiltrados);
  const evolucao = evolucaoPatrimonio(aportes, resumo.totalAtual);

  const evolucaoFiltrada =
    periodo === "custom"
      ? evolucao.filter(
          (m) => (!inicioCustom || m.chave >= inicioCustom) && (!fimCustom || m.chave <= fimCustom),
        )
      : periodo === "inicio"
        ? evolucao
        : evolucao.slice(-Number(periodo));

  const aplicadoFinal = Math.max(resumo.totalInvestido, 1);
  
  const dados = evolucaoFiltrada.map((m) => {
    const aplicado = Math.min(m.patrimonio, resumo.totalInvestido || m.patrimonio);
    return {
      mes: `${m.mes}/${m.chave.slice(2, 4)}`,
      aplicado: Math.round(aplicado),
      ganho: Math.round(resumo.lucroTotal * (aplicado / aplicadoFinal)),
    };
  });

  return (
    <Panel
      title="Evolução do Patrimônio"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <FiltroSelect
            valor={periodo}
            onChange={setPeriodo}
            icone={Calendar}
            opcoes={PERIODOS}
            rotuloAcessivel="Período do gráfico de evolução"
          />
          {periodo === "custom" ? (
            <div className="flex items-center gap-1">
              <input
                type="month"
                aria-label="Mês inicial"
                value={inicioCustom}
                onChange={(e) => setInicioCustom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="month"
                aria-label="Mês final"
                value={fimCustom}
                onChange={(e) => setFimCustom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          ) : null}
          <FiltroSelect
            valor={tipo}
            onChange={setTipo}
            icone={CircleDollarSign}
            opcoes={opcoesTipo}
            rotuloAcessivel="Tipo de ativo na evolução"
          />
        </div>
      }
    >



      <div className="legenda-grafico mb-3 text-foreground">
        <span className="chip-legenda serie-aplicado">
          <span className="ponto-legenda" aria-hidden />
          Valor aplicado
        </span>
        <span className="chip-legenda serie-ganho">
          <span className="ponto-legenda" aria-hidden />
          Ganho de capital
        </span>
        <span className="ml-auto text-muted-foreground">
          Cada barra mostra quanto do patrimônio veio de aportes e quanto veio de valorização.
        </span>
      </div>

      {dados.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted-foreground">
          Nenhum dado no período selecionado. Ajuste o filtro de período ou registre um aporte.
        </p>
      ) : (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ left: 12, right: 8, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab, var(--color-foreground) 16%, transparent)" vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={13} stroke="var(--color-foreground)" />
            <YAxis
              tickFormatter={(v: number) => brl(v, 0)}
              tickLine={false}
              axisLine={false}
              width={92}
              fontSize={13}
              stroke="var(--color-foreground)"
            />
            <Tooltip
              content={<TooltipEvolucao rotuloPeriodo="Mês" />}
              cursor={{ fill: "color-mix(in oklab, var(--color-muted) 60%, transparent)" }}
            />
            <Bar dataKey="aplicado" stackId="p" fill="var(--color-serie-investido)" name="Valor aplicado" />
            <Bar dataKey="ganho" stackId="p" fill="var(--color-serie-ganho)" name="Ganho de capital" radius={[6, 6, 0, 0]} />

          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </Panel>
  );
}
