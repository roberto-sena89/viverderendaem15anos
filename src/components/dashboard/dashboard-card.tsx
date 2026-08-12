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
        "bg-card/40 border-border/40 relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-300 backdrop-blur-md",
        onClick && "cursor-pointer hover:border-primary/60 hover:shadow-[var(--shadow-lift)] hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-left",
        className
      )}
    >
      {children}
    </Component>
  );
}
