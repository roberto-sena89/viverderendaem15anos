"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/**
 * Tracks whether a TooltipProvider is present anywhere above in the React tree
 * (including across portals). Radix's own provider context is not readable from
 * here, so we mirror it with our own flag.
 */
const TooltipProviderPresence = React.createContext(false);

const TooltipProvider = ({
  delayDuration = 150,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
    <TooltipProviderPresence.Provider value={true}>{children}</TooltipProviderPresence.Provider>
  </TooltipPrimitive.Provider>
);
TooltipProvider.displayName = "TooltipProvider";

/**
 * Self-healing Tooltip: if it is rendered outside of any TooltipProvider
 * (e.g. inside a portal-rendered subtree, an error boundary fallback, or a
 * standalone component), it provides its own so it never throws
 * "Tooltip must be used within TooltipProvider".
 */
const Tooltip = ({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
  const hasProvider = React.useContext(TooltipProviderPresence);

  if (hasProvider) {
    return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
  }

  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
    </TooltipProvider>
  );
};
Tooltip.displayName = "Tooltip";

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
