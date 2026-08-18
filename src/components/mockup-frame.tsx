import { cn } from "@/lib/utils";

interface MockupFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: "browser" | "device";
  showUrl?: boolean;
  url?: string;
}

/**
 * Moldura de dispositivo/browser premium para screenshots e mockups.
 * Suporta modo browser (desktop) e device (mobile).
 */
export function MockupFrame({
  children,
  className,
  variant = "browser",
  showUrl = true,
  url = "viverderendaem15anos.lovable.app",
}: MockupFrameProps) {
  if (variant === "device") {
    return (
      <div
        className={cn(
          "border-border/80 bg-background relative mx-auto w-full max-w-[320px] rounded-[2.5rem] border-[10px] shadow-2xl",
          className,
        )}
      >
        {/* Notch superior */}
        <div className="bg-border/80 absolute -top-1 left-1/2 z-10 h-5 w-32 -translate-x-1/2 rounded-b-2xl" />

        {/* Área de conteúdo */}
        <div className="relative h-[600px] w-full overflow-hidden rounded-[2rem] bg-card">
          {children}
        </div>

        {/* Barra inferior (home indicator) */}
        <div className="bg-border/50 absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/80 bg-background relative w-full overflow-hidden rounded-xl border shadow-2xl",
        className,
      )}
    >
      {/* Barra de título do browser */}
      <div className="border-border/60 bg-muted/50 flex items-center gap-2 border-b px-4 py-2.5">
        {/* Botões de controle (tráfego) */}
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FEBC2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>

        {/* URL bar */}
        {showUrl && (
          <div className="bg-background/80 border-border/40 text-muted-foreground mx-auto flex w-full max-w-md items-center justify-center gap-1 rounded-md border px-3 py-1 font-mono text-[0.65rem]">
            <svg
              className="size-3 opacity-50"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <rect height="11" rx="2" width="18" x="3" y="11" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="truncate">{url}</span>
          </div>
        )}

        {/* Espaço para alinhar os botões à esquerda */}
        {!showUrl && <div className="w-16" />}
      </div>

      {/* Área de conteúdo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-background">{children}</div>
    </div>
  );
}
