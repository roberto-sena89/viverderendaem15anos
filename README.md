# Viver de Renda em 15 Anos

## Configuração de provedores de IA (chaves API)

O Gestor IA usa provedores de IA via variáveis de ambiente do servidor. Configure as
chaves **uma única vez** — elas nunca vão para o navegador nem para o repositório.

### Onde configurar

- **Produção (Lovable):** Settings do projeto → Environment variables / Secrets.
- **Desenvolvimento local:** `.env.local` (na raiz do projeto, gitignored) — já existe
  um modelo com todos os placeholders.

### Variáveis disponíveis

| Variável | Provedor | Onde gerar a chave | Modelo gratuito padrão |
| --- | --- | --- | --- |
| `TOKEN_ROUTER_API_KEY` | Token Router | tokenrouter.com/dashboard | `deepseek/deepseek-v4-pro-0813-free` |
| `OPENROUTER_API_KEY` | OpenRouter | openrouter.ai/keys | `deepseek/deepseek-chat-v3-0324:free` |
| `NVIDIA_API_KEY` | NVIDIA NIM | build.nvidia.com/settings/api-keys | `meta/llama-3.3-70b-instruct` |
| `OPENCODE_API_KEY` | OpenCode Zen | opencode.ai/auth | `deepseek-v4-flash-free` |
| `CLINE_API_KEY` | Cline | app.cline.bot → Settings → API Keys | `minimax/minimax-m2.5` |

Override opcional de URL base por provedor: `<PREFIXO>_BASE_URL`
(ex.: `TOKEN_ROUTER_BASE_URL`, `OPENROUTER_BASE_URL`).

### Precedência

1. Configuração do usuário salva no navegador (localStorage, via diálogo do Gestor IA).
2. Primeira chave de ambiente existente, na ordem da tabela acima.
3. IA nativa da plataforma (Lovable AI Gateway).