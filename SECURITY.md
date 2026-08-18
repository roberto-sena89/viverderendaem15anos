# Política de Segurança

## Versões Suportadas

| Versão             | Suportada |
| ------------------ | --------- |
| main (latest)      | ✅        |
| Versões anteriores | ❌        |

**Nota:** Apenas a branch `main` recebe atualizações de segurança. Recomendamos manter sua instalação atualizada com o último commit da main.

---

## Reportando Vulnerabilidades

### Como Reportar

**NÃO abra issues públicos** para vulnerabilidades de segurança. Use um dos canais privados abaixo:

1. **GitHub Security Advisories** (preferencial): [Abra um advisory privado](https://github.com/roberto-sena89/viverderendaem15anos/security/advisories/new)
2. **E-mail**: segurança@roberto-sena89.github.io (ou use o e-mail associado à conta GitHub)

### Informações Necessárias

Inclua no relatório:

- Descrição clara da vulnerabilidade
- Passos para reproduzir (PoC se possível)
- Impacto potencial (confidencialidade, integridade, disponibilidade)
- Versões/commits afetados
- Sugestão de mitigação ou correção (se tiver)

### Tempo de Resposta

| Severidade | Confirmação | Correção        |
| ---------- | ----------- | --------------- |
| Critical   | ≤ 24h       | ≤ 72h           |
| High       | ≤ 48h       | ≤ 7 dias        |
| Medium     | ≤ 7 dias    | ≤ 30 dias       |
| Low        | ≤ 14 dias   | Próximo release |

---

## Medidas de Segurança Implementadas

### CI/CD Pipeline (`.github/workflows/security-audit.yml`)

| Job                    | Frequência       | Ferramentas                                     |
| ---------------------- | ---------------- | ----------------------------------------------- |
| **Dependency Audit**   | Push, PR, Diário | `npm audit`, script customizado                 |
| **SAST**               | Push, PR         | ESLint + `eslint-plugin-security`, SARIF upload |
| **Secret Scanning**    | Push, PR         | TruffleHog                                      |
| **License Compliance** | Push, PR         | license-checker                                 |
| **Dependency Review**  | PR apenas        | actions/dependency-review-action                |

### Proteções de Código

- **TypeScript strict mode** — tipos rigorosos previnem classes de bugs
- **ESLint security plugin** — detecta padrões inseguros (eval, regex DoS, etc.)
- **Prettier + format-on-save** — consistência reduz erros
- **Patch-package** — correções de segurança em deps sem aguardar upstream

### Dependências

- **Overrides configurados** para vulnerabilidades conhecidas (brace-expansion, uuid, etc.)
- **Verificação diária** de correções instaláveis via `scripts/check-vuln-fixes.mjs`
- **Política de licenças** — bloqueia GPL/AGPL/MPL em dependências de produção

### Runtime

- **CSP headers** via TanStack Start middleware
- **Autenticação** via Lovable Cloud Auth (OAuth2/OIDC)
- **Validação de entrada** com Zod schemas
- **Sanitização** de HTML user-generated (DOMPurify + marked)

---

## Processo de Divulgação (Disclosure)

1. **Recebimento** — confirmamos em ≤ 24h (Critical/High) ou ≤ 7 dias
2. **Validação** — reproduzimos e classificamos (CVSS)
3. **Correção** — desenvolvemos fix em branch privada
4. **Teste** — validamos correção + regressão
5. **Release** — publicamos fix + advisory GitHub
6. **Divulgação** — após 7 dias do release, detalhes tornados públicos

### Coordinated Disclosure

Se você descobriu uma vulnerabilidade:

- Damos crédito no advisory (se desejado)
- Coordenamos timeline de divulgação
- Não processamos legalmente pesquisadores de boa-fé

---

## Boas Práticas para Contribuidores

### Commits

```bash
# Assine commits (GPG/SSH)
git commit -S -m "feat: adiciona validação X"

# Use conventional commits
fix(security): corrige XSS em formulário Y
```

### Pull Requests

- ✅ CI passa (inclui security jobs)
- ✅ Sem segredos no código (TruffleHog)
- ✅ Dependências com licenças compatíveis
- ✅ Testes para nova funcionalidade

### Desenvolvimento Local

```bash
# Audit local
npm audit
npm run audit:fixes

# Lint com regras de segurança
npm run lint

# Verificar segredos antes de commit
npx trufflehog filesystem . --fail
```

---

## Configuração de Segurança do Repositório

### Branch Protection (main)

- ✅ Require PR reviews (≥ 1)
- ✅ Require status checks (todos os jobs CI)
- ✅ Require signed commits
- ✅ Require linear history
- ✅ Block force pushes
- ✅ Block deletions

### Dependabot

- ✅ Security updates automáticas
- ✅ Version updates semanais
- ✅ Auto-merge para patch/minor (após CI)

### Code Scanning

- ✅ ESLint SARIF upload
- ✅ CodeQL analysis (configurado separadamente)

---

## Contato

| Assunto                | Canal                      |
| ---------------------- | -------------------------- |
| Vulnerabilidade        | GitHub Security Advisories |
| Dúvidas gerais         | Issues (público)           |
| Melhorias de segurança | PR ou Issue                |

---

## Histórico de Atualizações

| Data       | Versão | Mudanças                                   |
| ---------- | ------ | ------------------------------------------ |
| 2026-08-17 | 1.0    | Política inicial + CI/CD security pipeline |

---

**Última revisão:** 2026-08-17  
**Próxima revisão programada:** 2026-11-17 (trimestral)
