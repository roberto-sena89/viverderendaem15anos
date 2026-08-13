import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Settings2, Wallet, Target, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAtivos, usePlano } from "@/lib/data";
import { usePerfilInvestidor } from "@/lib/perfil-investidor";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
  actionLabel: string;
  actionHref: string;
}

export function OnboardingGestorIA({ onComplete }: { onComplete: () => void }) {
  const { data: ativos } = useAtivos();
  const { data: plano } = usePlano();
  const { perfil } = usePerfilInvestidor();
  
  const [steps, setSteps] = useState<Step[]>([]);
  
  useEffect(() => {
    const newSteps: Step[] = [
      {
        id: "perfil",
        title: "Definir Perfil de Investidor",
        description: "Ajuste seu perfil (Conservador, Moderado ou Agressivo) para o Gestor entender seu apetite a risco.",
        icon: Settings2,
        completed: !!perfil,
        actionLabel: "Ajustar no Chat",
        actionHref: "/chat",
      },
      {
        id: "ativos",
        title: "Registrar Carteira",
        description: "Adicione seus ativos atuais para que a IA possa analisar diversificação e rentabilidade.",
        icon: Wallet,
        completed: (ativos?.length ?? 0) > 0,
        actionLabel: "Adicionar Ativos",
        actionHref: "/carteira",
      },
      {
        id: "plano",
        title: "Configurar Plano de Independência",
        description: "Defina suas metas e prazos para o Gestor IA projetar seu futuro financeiro.",
        icon: Target,
        completed: !!plano && plano.idadeAtual > 0,
        actionLabel: "Configurar Plano",
        actionHref: "/planejador",
      },
      {
        id: "auditoria",
        title: "Primeira Auditoria",
        description: "Peça ao Gestor IA uma auditoria completa para identificar gaps na sua estratégia.",
        icon: Sparkles,
        completed: false, // This will be the final step to trigger
        actionLabel: "Falar com Gestor",
        actionHref: "/chat",
      }
    ];
    setSteps(newSteps);
  }, [ativos, plano, perfil]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <Card className="mx-auto w-full max-w-2xl border-primary/20 bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <Sparkles className="text-primary size-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Bem-vindo ao Gestor IA</CardTitle>
            <CardDescription>
              Complete os passos abaixo para extrair o máximo de inteligência da sua carteira.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progresso da configuração</span>
            <span className="text-primary font-bold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                step.completed ? "bg-primary/5 border-primary/20" : "bg-background/50 border-border"
              }`}
            >
              <div className={`mt-1 shrink-0 ${step.completed ? "text-primary" : "text-muted-foreground"}`}>
                {step.completed ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className={`size-4 ${step.completed ? "text-primary" : "text-muted-foreground"}`} />
                  <h4 className={`font-semibold ${step.completed ? "text-primary" : "text-foreground"}`}>
                    {step.title}
                  </h4>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                <Button variant="ghost" size="sm" className="shrink-0 gap-1" asChild>
                  <a href={step.actionHref}>
                    {step.actionLabel}
                    <ArrowRight className="size-3" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="ghost" onClick={onComplete}>Pular agora</Button>
        <Button onClick={onComplete} disabled={completedCount < 3}>
          Começar a usar
        </Button>
      </CardFooter>
    </Card>
  );
}
