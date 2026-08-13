import { Link } from "@tanstack/react-router";
import logoIcone from "@/assets/logo-icone.webp";

/**
 * Rodapé padrão das páginas públicas: marca, aviso educacional e
 * navegação de conteúdo. Mesma estrutura em todo o site.
 */
export function RodapePublico() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-14 pb-8 sm:px-6 md:flex-row md:justify-between">
        <div className="flex min-w-0 max-w-xs items-start gap-3">
          <img
            src={logoIcone}
            alt=""
            aria-hidden
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-lg"
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            <span className="text-foreground font-hero font-bold">Viver de Renda em 15 Anos</span>
            <br />
            Conteúdo educacional sobre renda passiva, dividendos e independência financeira. Não é
            recomendação de investimento.
          </p>
        </div>
        <nav
          aria-label="Links do rodapé"
          className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-2"
        >
          <div>
            <h3 className="text-foreground/80 mb-4 text-[0.62rem] font-bold tracking-[0.2em] uppercase">
              Conteúdo
            </h3>
            <ul className="text-muted-foreground space-y-3 text-xs">
              <li>
                <Link className="hover:text-primary" to="/guia-liberdade-financeira">
                  Guia
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/calculadora-juros-compostos">
                  Calculadora
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/blog/melhores-livros-financas">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-foreground/80 mb-4 text-[0.62rem] font-bold tracking-[0.2em] uppercase">
              Plataforma
            </h3>
            <ul className="text-muted-foreground space-y-3 text-xs">
              <li>
                <Link className="hover:text-primary" to="/o-que-e-renda-passiva">
                  Renda passiva
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/quanto-rende-1-milhao-por-mes">
                  Simulações
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary" to="/auth">
                  Entrar
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="border-border/60 text-muted-foreground mx-auto mt-6 max-w-6xl border-t px-5 py-6 text-center text-[0.6rem] tracking-[0.2em] uppercase sm:px-6">
        © {new Date().getFullYear()} Viver de Renda em 15 Anos
      </div>
    </footer>
  );
}
