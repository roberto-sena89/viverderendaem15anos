import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AbasPlanejamento } from "@/components/abas-planejamento";
import { PainelAuditorias } from "@/components/dashboard/painel-auditorias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlano, useSalvarPlano } from "@/lib/data";
import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { solicitarAuditoria, type AuditoriaRegistro } from "@/lib/auditoria-ia.functions";
import { brl, planoPadrao, resumoCarteira, type PlanoConfig } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import { urlAbsoluta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria da Carteira · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Preencha os dados reais do seu plano e gere uma auditoria completa da carteira, com score, projeções e análise do Gestor IA.",
      },
      { property: "og:title", content: "Auditoria da Carteira" },
      {
        property: "og:description",
        content: "Auditoria com dados reais do plano, salva no histórico do painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: urlAbsoluta("/auditoria") }],
  }),
  component: PaginaAuditoria,
});

const PERFIS = [
  { id: "conservador", rotulo: "Conservador", nota: "Mais renda fixa e proteção" },
  { id: "moderado", rotulo: "Moderado", nota: "Equilíbrio entre renda e crescimento" },
  { id: "agressivo", rotulo: "Agressivo", nota: "Mais ações e exposição ao exterior" },
] as const;

type Perfil = (typeof PERFIS)[number]["id"];

function PaginaAuditoria() {
  const queryClient = useQueryClient();
  const { data: carteira = [] } = useAtivosAoVivo();
  const { data: plano } = usePlano();
  const salvarPlano = useSalvarPlano();
  const solicitar = useServerFn(solicitarAuditoria);
  const { totalAtual } = resumoCarteira(carteira);

  const [perfil, setPerfil] = useState<Perfil>("moderado");
  const [form, setForm] = useState<PlanoConfig>({ ...planoPadrao });

  useEffect(() => {
    if (plano) setForm({ ...plano });
  }, [plano]);

  const gerar = useMutation({
    mutationFn: async () => {
      await salvarPlano.mutateAsync(form);
      return (await solicitar({ data: { perfil } })) as AuditoriaRegistro;
    },
    onSuccess: (registro) => {
      void queryClient.invalidateQueries({ queryKey: ["auditorias"] });
      toast.success(
        registro.status === "concluida"
          ? `Auditoria salva no histórico (${registro.provedor_ia ?? "Gestor IA"}).`
          : "Auditoria salva com os números reais da carteira (a análise escrita não veio agora).",
      );
      document.getElementById("historico-auditorias")?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar a auditoria."),
  });

  const campo = (k: keyof PlanoConfig) => (v: number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <AppShell
      title="Auditoria da Carteira"
      description="Confirme os dados reais do seu plano e gere uma auditoria completa"
    >
      <AbasPlanejamento />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] [&>*]:min-w-0">
        <form
          className="surface-card space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            gerar.mutate();
          }}
        >
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ClipboardCheck className="text-primary size-4" />
              Dados do plano
            </h2>
            <p className="text-muted-foreground text-sm">
              Estes números são salvos no seu plano e usados na auditoria.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Idade atual"
              value={form.idadeAtual}
              onChange={campo("idadeAtual")}
              min={16}
              max={90}
            />
            <Campo
              label="Idade da aposentadoria"
              value={form.idadeAposentadoria}
              onChange={campo("idadeAposentadoria")}
              min={20}
              max={100}
            />
            <Campo
              label="Aporte mensal (R$)"
              value={form.aporteMensal}
              onChange={campo("aporteMensal")}
              step={100}
            />
            <Campo
              label="Aumento anual (%)"
              value={form.aumentoAnual}
              onChange={campo("aumentoAnual")}
              step={0.5}
            />
            <Campo
              label="Rentabilidade anual (%)"
              value={form.rentabilidadeAnual}
              onChange={campo("rentabilidadeAnual")}
              step={0.5}
            />
            <Campo
              label="Inflação anual (%)"
              value={form.inflacaoAnual}
              onChange={campo("inflacaoAnual")}
              step={0.1}
            />
            <Campo
              label="Taxa de retirada (%)"
              value={form.taxaRetirada}
              onChange={campo("taxaRetirada")}
              step={0.1}
            />
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Patrimônio atual</Label>
              <div className="border-border/60 bg-background/40 flex h-9 items-center rounded-md border px-3 text-sm font-semibold">
                {brl(totalAtual)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Perfil de investidor</Label>
            <div className="grid gap-2">
              {PERFIS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPerfil(p.id)}
                  className={cn(
                    "border-border/60 bg-background/40 rounded-lg border px-3 py-2 text-left transition-colors",
                    perfil === p.id && "border-primary/50 bg-primary/10",
                  )}
                >
                  <p className="text-sm font-semibold">{p.rotulo}</p>
                  <p className="text-muted-foreground text-xs">{p.nota}</p>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={gerar.isPending}>
            {gerar.isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-4" />
            )}
            {gerar.isPending ? "Auditando…" : "Salvar plano e auditar"}
          </Button>
          <p className="text-muted-foreground text-xs">
            A auditoria lê sua carteira, seus aportes, seus proventos e suas metas — e fica salva no
            histórico abaixo.
          </p>
        </form>

        <div id="historico-auditorias" className="space-y-4">
          <PainelAuditorias />
        </div>
      </div>
    </AppShell>
  );
}

function Campo({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
