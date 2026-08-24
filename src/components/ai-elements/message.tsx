"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
// Os plugins `code` (Shiki) e `mermaid` foram removidos de propósito: juntos
// adicionavam ~2,3 MB gzip ao bundle do worker e estouravam o limite de deploy
// (site respondia 502). O assistente financeiro não renderiza diagramas nem
// blocos de código com realce.
import { math } from "@streamdown/math";
import type { UIMessage } from "ai";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full min-w-0 flex-col gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
      from === "user" ? "is-user ml-auto max-w-[95%] justify-end" : "is-assistant max-w-full",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
      "group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({ className, children, ...props }: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(null);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error("MessageBranch components must be used within MessageBranch");
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange],
  );

  const goToPrevious = useCallback(() => {
    const newBranch = currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch = currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious],
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div className={cn("grid w-full gap-2 [&>div]:pb-0", className)} {...props} />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({ children, ...props }: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? (children as ReactElement[]) : [children as ReactElement]),
    [children],
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden",
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = ({ className, ...props }: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className,
      )}
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({ children, ...props }: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({ children, ...props }: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({ className, ...props }: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn("border-none bg-transparent text-muted-foreground shadow-none", className)}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, math };

/**
 * Estilo das tabelas geradas pelo Gestor IA: cartão moderno sem quebra de
 * linha indesejada, colunas proporcionais, alinhamento limpo, leitura fácil.
 */
const estiloTabelas = cn(
  // Container externo (data-streamdown="table-wrapper")
  "[&_[data-streamdown='table-wrapper']]:my-4",
  "[&_[data-streamdown='table-wrapper']]:mx-auto",
  "[&_[data-streamdown='table-wrapper']]:w-full",
  "[&_[data-streamdown='table-wrapper']]:max-w-full",
  "[&_[data-streamdown='table-wrapper']]:rounded-xl",
  "[&_[data-streamdown='table-wrapper']]:border",
  "[&_[data-streamdown='table-wrapper']]:border-border/50",
  "[&_[data-streamdown='table-wrapper']]:bg-card/30",
  "[&_[data-streamdown='table-wrapper']]:shadow-[var(--shadow-lift)]",
  // Área de rolagem interna do Streamdown — esconde barra de rolagem feia
  "[&_[data-streamdown='table-wrapper']>div:last-child]:scrollbar-none",
  "[&_[data-streamdown='table-wrapper']>div:last-child]:overscroll-x-contain",
  // Tabela base — largura total, colunas proporcionais ao conteúdo
  "[&_table[data-streamdown='table']]:m-0",
  "[&_table[data-streamdown='table']]:w-full",
  "[&_table[data-streamdown='table']]:min-w-max",
  "[&_table[data-streamdown='table']]:table-auto",
  "[&_table[data-streamdown='table']]:border-collapse",
  "[&_table[data-streamdown='table']]:text-[0.8125rem]",
  "sm:[&_table[data-streamdown='table']]:text-sm",
  // Cabeçalho — fundo escuro, borda inferior, tracking
  "[&_table[data-streamdown='table']>thead]:border-b-2",
  "[&_table[data-streamdown='table']>thead]:border-border/60",
  "[&_table[data-streamdown='table']>thead]:bg-muted/50",
  "[&_table[data-streamdown='table']>thead>tr>th]:px-3",
  "[&_table[data-streamdown='table']>thead>tr>th]:py-2.5",
  "[&_table[data-streamdown='table']>thead>tr>th]:text-[0.75rem]",
  "[&_table[data-streamdown='table']>thead>tr>th]:font-semibold",
  "[&_table[data-streamdown='table']>thead>tr>th]:uppercase",
  "[&_table[data-streamdown='table']>thead>tr>th]:tracking-[0.08em]",
  "[&_table[data-streamdown='table']>thead>tr>th]:text-muted-foreground",
  "sm:[&_table[data-streamdown='table']>thead>tr>th]:px-4",
  "sm:[&_table[data-streamdown='table']>thead>tr>th]:py-3",
  "sm:[&_table[data-streamdown='table']>thead>tr>th]:text-xs",
  // Células — padding generoso, SEM QUEBRA DE LINHA
  "[&_table[data-streamdown='table']>tbody>tr>td]:px-3",
  "[&_table[data-streamdown='table']>tbody>tr>td]:py-2",
  "[&_table[data-streamdown='table']>tbody>tr>td]:align-middle",
  "[&_table[data-streamdown='table']>tbody>tr>td]:whitespace-nowrap",
  "sm:[&_table[data-streamdown='table']>tbody>tr>td]:px-4",
  "sm:[&_table[data-streamdown='table']>tbody>tr>td]:py-2.5",
  // Linhas — borda sutil + striped alternado + hover
  "[&_table[data-streamdown='table']>tbody>tr]:border-t",
  "[&_table[data-streamdown='table']>tbody>tr]:border-border/30",
  "[&_table[data-streamdown='table']>tbody>tr:nth-child(even)]:bg-muted/15",
  "[&_table[data-streamdown='table']>tbody>tr:hover]:bg-muted/30",
  // Primeira coluna (nome / ticker) — destaque à esquerda
  "[&_table[data-streamdown='table']>tbody>tr>td:first-child]:font-medium",
  "[&_table[data-streamdown='table']>tbody>tr>td:first-child]:text-foreground",
  "[&_table[data-streamdown='table']>tbody>tr>td:first-child]:text-left",
  "[&_table[data-streamdown='table']>thead>tr>th:first-child]:text-left",
  // Última coluna (valores) — alinhada à direita, tabular-nums
  "[&_table[data-streamdown='table']>tbody>tr>td:last-child]:text-right",
  "[&_table[data-streamdown='table']>tbody>tr>td:last-child]:font-medium",
  "[&_table[data-streamdown='table']>tbody>tr>td:last-child]:tabular-nums",
  "[&_table[data-streamdown='table']>thead>tr>th:last-child]:text-right",
  // Colunas do meio — centralizadas para grade visual limpa
  "[&_table[data-streamdown='table']>tbody>tr>td:not(:first-child):not(:last-child)]:text-center",
  "[&_table[data-streamdown='table']>thead>tr>th:not(:first-child):not(:last-child)]:text-center",
  // Cor do texto padrão nas células — contraste AA
  "[&_table[data-streamdown='table']>tbody>tr>td]:text-foreground",
  "[&_table[data-streamdown='table']>tbody>tr>td:last-child]:text-foreground",
);

/**
 * Tipografia editorial do Gestor IA: leitura confortavel, hierarquia clara e
 * destaques na paleta da marca, sem ruido visual.
 */
const estiloTexto = cn(
  "prose-legivel text-[1rem] leading-[1.75] tracking-[-0.005em] text-pretty text-foreground",
  "[&_p]:my-3 [&_p]:max-w-[68ch]",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.12em] [&_h3]:text-muted-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:text-foreground/80",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-primary",
  "[&_ul]:my-3 [&_ul]:list-none [&_ul]:space-y-1.5 [&_ul]:pl-1",
  "[&_ul>li]:relative [&_ul>li]:pl-5",
  "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.65em] [&_ul>li]:before:size-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-primary/70",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:marker:font-semibold [&_ol]:marker:text-primary/70",
  "[&_li]:leading-relaxed",
  "[&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-foreground/80",
  "[&_hr]:my-6 [&_hr]:border-border/50",
  "[&_code]:rounded-md [&_code]:border [&_code]:border-border/50 [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.82em]",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-card/60 [&_pre]:p-4",
  "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
);

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full min-w-0 max-w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        estiloTexto,
        estiloTabelas,
        className,
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && nextProps.isAnimating === prevProps.isAnimating,
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({ className, children, ...props }: MessageToolbarProps) => (
  <div className={cn("mt-4 flex w-full items-center justify-between gap-4", className)} {...props}>
    {children}
  </div>
);
