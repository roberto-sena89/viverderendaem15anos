import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarCarteira from "./tools/listar-carteira";
import resumoPatrimonio from "./tools/resumo-patrimonio";
import listarDividendos from "./tools/listar-dividendos";
import listarMetas from "./tools/listar-metas";
import registrarAporte from "./tools/registrar-aporte";

// O issuer OAuth precisa ser o host direto do Supabase (o proxy publicado quebra a validação RFC 8414).
const projectRef = String(import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset");

export default defineMcp({
  name: "investidor-15-anos-mcp",
  title: "Investidor em 15 Anos",
  version: "0.1.0",
  instructions:
    "Ferramentas da plataforma Investidor em 15 Anos. Use `resumo_patrimonio` para a visão geral da carteira, `listar_carteira` para os ativos, `listar_dividendos` para proventos, `listar_metas` para o progresso das metas e `registrar_aporte` para lançar uma nova compra. Valores em reais (BRL).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [resumoPatrimonio, listarCarteira, listarDividendos, listarMetas, registrarAporte],
});
