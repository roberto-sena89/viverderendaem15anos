/** Destaca as ocorrências do termo pesquisado dentro de um texto. */
export function RealceTermo({ texto, termo }: { texto: string; termo?: string }) {
  const alvo = (termo ?? "").trim();
  if (!alvo) return <>{texto}</>;

  const partes: Array<{ t: string; marca: boolean }> = [];
  const baixo = texto.toLowerCase();
  const busca = alvo.toLowerCase();
  let i = 0;
  while (i < texto.length) {
    const idx = baixo.indexOf(busca, i);
    if (idx === -1) {
      partes.push({ t: texto.slice(i), marca: false });
      break;
    }
    if (idx > i) partes.push({ t: texto.slice(i, idx), marca: false });
    partes.push({ t: texto.slice(idx, idx + busca.length), marca: true });
    i = idx + busca.length;
  }

  return (
    <>
      {partes.map((p, k) =>
        p.marca ? (
          <mark
            key={k}
            className="rounded-[3px] bg-primary/25 px-0.5 text-foreground ring-1 ring-primary/40"
          >
            {p.t}
          </mark>
        ) : (
          <span key={k}>{p.t}</span>
        ),
      )}
    </>
  );
}
