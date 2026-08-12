import { cn } from "@/lib/utils";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Componente de Card padronizado para o Dashboard.
 * Garante consistência de altura mínima, padding, bordas e efeitos em toda a interface.
 */
export function DashboardCard({ 
  children, 
  className, 
  onClick,
  ariaLabel 
}: DashboardCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-300",
        "bg-card/30 border-white/5 dark:border-white/10 backdrop-blur-xl shadow-sm",
        onClick && "cursor-pointer hover:border-primary/40 hover:bg-card/50 hover:shadow-xl hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-left active:scale-[0.98]",
        className
      )}
    >
      {children}
    </Component>
  );
}
