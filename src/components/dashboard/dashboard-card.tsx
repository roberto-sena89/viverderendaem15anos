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
        "surface-card relative flex min-h-[128px] flex-col justify-between overflow-hidden p-4 transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] text-left",
        className
      )}
    >
      {children}
    </Component>
  );
}
