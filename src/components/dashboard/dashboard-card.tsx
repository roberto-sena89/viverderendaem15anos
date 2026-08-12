import { cn } from "@/lib/utils";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement | HTMLButtonElement> {
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
  ariaLabel,
  ...props
}: DashboardCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
      className={cn(
        "surface-card relative flex min-h-[120px] flex-col justify-center overflow-hidden p-3 transition-all duration-300 sm:min-h-[152px] sm:p-4",
        onClick && "cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-center group",
        className
      )}
    >
      {children}
    </Component>
  );
}
