import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ExternalLink, Link2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogDetalheAtivo } from "@/components/dialog-detalhe-ativo";
import {
  BadgeCategoria,
  MarcaFonte,
  SeloUrgente,
  TickersMencionados,
  tempoRelativo,
} from "./cartoes";
import type { Noticia } from "@/lib/noticias.functions";

function dataCompleta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Leitura da notícia: manchete, resumo próprio e link para o veículo de
 * origem. O conteúdo integral nunca é reproduzido aqui.
 */
export function ModalNoticia({
  noticia,
  salva,
  onOpenChange,
  onSalvar,
}: {
  noticia: Noticia | null;
  salva: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvar: (n: Noticia) => void;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);

  async function copiarLink() {
    if (!noticia) return;
    try {
      await navigator.clipboard.writeText(noticia.url);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  const Icone = salva ? BookmarkCheck : Bookmark;

  return (
    <>
      <Dialog open={!!noticia} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          {noticia ? (
            <>
              {noticia.imagem ? (
                <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
                  <img
                    src={noticia.imagem}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </div>
              ) : null}

              <div className="p-5 sm:p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {noticia.urgente ? <SeloUrgente /> : null}
                  <BadgeCategoria categoria={noticia.categoria} />
                  <MarcaFonte fonte={noticia.fonte} />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {tempoRelativo(noticia.publicadoEm)}
                  </span>
                </div>

                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="font-display text-xl leading-tight font-bold text-balance sm:text-2xl">
                    {noticia.titulo}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {noticia.autor ? `${noticia.autor} · ` : ""}
                    {noticia.fonte} · {dataCompleta(noticia.publicadoEm)}
                  </DialogDescription>
                </DialogHeader>

                {noticia.resumo ? (
                  <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Resumo
                    </p>
                    <p className="text-[1.02rem] leading-relaxed">{noticia.resumo}</p>
                  </div>
                ) : null}

                {noticia.tickers.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Ativos mencionados
                    </p>
                    <TickersMencionados tickers={noticia.tickers} onTicker={setAtivo} />
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button asChild>
                    <a href={noticia.url} target="_blank" rel="noopener noreferrer">
                      Ler notícia completa <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => onSalvar(noticia)} aria-pressed={salva}>
                    <Icone className="size-4" />
                    {salva ? "Salva" : "Salvar"}
                  </Button>
                  <Button variant="outline" onClick={copiarLink}>
                    <Link2 className="size-4" /> Copiar link
                  </Button>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Exibimos apenas manchete e resumo. O conteúdo integral permanece no site do
                  veículo de origem.
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {ativo ? (
        <DialogDetalheAtivo
          simbolo={`${ativo}.SA`}
          rotulo={ativo}
          aberto={!!ativo}
          onOpenChange={(v) => !v && setAtivo(null)}
        />
      ) : null}
    </>
  );
}
