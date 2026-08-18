import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatarNumeroBR, numeroBR } from "@/lib/formato-numero";

interface InputNumeroBRProps {
  id: string;
  /** Nome enviado no FormData (valor numérico puro, ex.: 19463.53). */
  name: string;
  defaultValue?: number;
  /** Prefixo exibido dentro do campo, ex.: "R$". */
  prefixo?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

/**
 * Campo numérico com máscara brasileira (19.463,53) e sempre duas casas decimais.
 * O valor enviado no formulário é numérico puro, via input oculto.
 */
export function InputNumeroBR({
  id,
  name,
  defaultValue = 0,
  prefixo,
  placeholder = "0,00",
  required,
  className,
  ...rest
}: InputNumeroBRProps) {
  const [texto, setTexto] = useState(() => formatarNumeroBR(defaultValue));

  return (
    <div className="relative">
      {prefixo && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          {prefixo}
        </span>
      )}
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => setTexto(formatarNumeroBR(e.target.value))}
        className={cn(prefixo && "pl-10", "text-right tabular-nums", className)}
        {...rest}
      />
      <input type="hidden" name={name} value={numeroBR(texto)} />
    </div>
  );
}
