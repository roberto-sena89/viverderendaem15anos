# Bug Bounty Program — Viver de Renda em 15 Anos

> **Programa de recompensa por vulnerabilidades de segurança**

---

## Visão Geral

Este programa recompensa pesquisadores de segurança que descobrem e reportam vulnerabilidades de forma responsável. Operamos em **boa-fé**: não processamos legalmente pesquisadores que seguem esta política.

---

## Escopo

### ✅ In Scope (Elegíveis para recompensa)

| Categoria | Exemplos | Severidade Máxima |
|-----------|----------|-------------------|
| **Aplicação Web** (https://viverderendaem15anos.com) | XSS, CSRF, IDOR, SSRF, RCE, Auth bypass, Logic flaws | Critical |
| **API** (`/api/*`, `/mcp/*`) | Broken auth, rate limit bypass, injection, data exposure | Critical |
| **Autenticação/Autorização** | OAuth flaws, session fixation, privilege escalation | Critical |
| **Client-side** | DOM XSS, prototype pollution, unsafe postMessage | High |
| **Infraestrutura exposta** | Subdomain takeover, exposed .git, cloud misconfig | High |
| **Dependências** | Vulnerabilidades em deps com PoC explorável no nosso contexto | Medium-High |

### ❌ Out of Scope (Não elegíveis)

| Categoria | Motivo |
|-----------|--------|
| **DoS/DDoS** | Testa disponibilidade, não segurança |
| **Engenharia social/Phishing** | Alvo: usuários, não sistemas |
| **Ausência de headers** (HSTS, CSP, etc.) | Já conhecidos, em roadmap |
| **Rate limiting ausente** | Em implementação |
| **Informational** (versão do server, directory listing) | Baixo impacto |
| **Vulnerabilidades em deps sem PoC explorável** | Não demonstram risco real |
| **Autocompletar/senhas no navegador** | Comportamento do browser |
| **Clickjacking em páginas públicas sem ação sensível** | Sem impacto de segurança |
| **Auto-XSS** (requer interação da vítima colando payload) | Não explorável remotamente |
| **Issues em ambientes de dev/staging não produzidos** | Não afetam usuários reais |

### 🎯 Ativos Principais

```
https://viverderendaem15anos.com          # Produção
https://api.viverderendaem15anos.com      # API (se houver)
https://*.viverderendaem15anos.com        # Subdomínios oficiais
```

---

## Recompensas (USD)

| Severidade (CVSS 4.0) | Valor | Exemplos |
|------------------------|-------|----------|
| **Critical** (9.0–10.0) | **$500–$2.000** | RCE, Auth bypass, SQLi, SSRF c/ acesso interno |
| **High** (7.0–8.9) | **$200–$500** | XSS stored/reflected, IDOR crítico, PrivEsc |
| **Medium** (4.0–6.9) | **$50–$200** | XSS DOM, CSRF em ação sensível, Info disclosure |
| **Low** (0.1–3.9) | **$25–$50** | Info disclosure menor, headers faltando |

### Multiplicadores

| Condição | Multiplicador |
|----------|---------------|
| **PoC funcional + vídeo** | 1.25x |
| **Patch/sugestão de correção** | 1.25x |
| **Cadeia de exploração (chaining)** | 1.5x |
| **Primeira descoberta do tipo** | 1.25x |
| **Máximo por relatório** | **$2.000** |

### Pagamento

- Via **GitHub Sponsors**, **PayPal**, **PIX** ou **Transferência bancária** (Brasil)
- Processado em **≤ 14 dias** após validação e correção
- Requer **W-8BEN** (não-EUA) ou **W-9** (EUA) para valores ≥ $600/ano

---

## Regras do Programa

### Obrigatórias

1. **Reportar privadamente** via [GitHub Security Advisories](https://github.com/roberto-sena89/viverderendaem15anos/security/advisories/new)
2. **Não acessar/exfiltrar dados** de outros usuários
3. **Não modificar/destruir** dados
4. **Não testar em contas de terceiros** sem permissão
5. **Não fazer DoS, fuzzing agressivo, ou scans automatizados** (>10 req/s)
6. **Dar tempo para correção** antes de divulgar (mín. 90 dias ou até fix + 7 dias)
7. **Uma submissão por vulnerabilidade** (não fragmentar)

### Proibidas (Desqualificam)

- Acesso a dados de outros usuários
- Movimento lateral / pivot
- Engenharia social contra funcionários/usuários
- Testes em infraestrutura de terceiros (CDN, DNS, GitHub, Vercel, Supabase)
- Divulgação prematura
- Extorsão / ameaça de divulgação

---

## Processo de Submissão

### 1. Submeta via GitHub Security Advisories

```
Título: [BUG BOUNTY] <Tipo> em <Componente> — <Impacto resumido>

Corpo:
- **Descrição**: O que é a vulnerabilidade
- **Passos para reproduzir**: Númeroados, reproduzíveis
- **PoC**: Código, curl, screenshots, vídeo (loom/gyazo)
- **Impacto**: O que um atacante consegue fazer
- **Severidade estimada**: Critical/High/Medium/Low + vetor CVSS
- **Ambiente**: Browser, OS, conta de teste usada
- **Sugestão de fix**: Opcional, mas valorizada
```

### 2. Triagem (≤ 48h)

- Confirmação de recebimento
- Classificação inicial (in/out of scope)
- Atribuição de tracker interno

### 3. Validação (≤ 7 dias)

- Reprodução interna
- Cálculo CVSS 4.0 oficial
- Determinação da recompensa

### 4. Correção

- Desenvolvimento do fix em branch privada
- Testes de regressão
- Deploy para produção

### 5. Pagamento & Divulgação

- Pagamento em ≤ 14 dias após deploy
- Crédito no Hall of Fame (se autorizado)
- Divulgação coordenada (advisory GitHub após fix + 7 dias)

---

## Hall of Fame

| Pesquisador | Vulnerabilidade | Data | Recompensa |
|-------------|----------------|------|------------|
| — | — | — | — |

*Seu nome aqui na próxima descoberta válida!*

---

## Safe Harbor (Porto Seguro)

> **Não iniciaremos ação legal** contra você se:
>
> - Você seguir esta política de boa-fé
> - Reportar a vulnerabilidade prontamente via canal oficial
> - Não acessar dados além do necessário para provar o conceito
> - Não divulgar prematuramente
> - Cooperar na validação e correção

Esta proteção cobre: CFAA, DMCA 1201, leis estaduais de computação, e termos de serviço do GitHub/Vercel/Supabase.

---

## Contato

| Finalidade | Canal |
|------------|-------|
| Submissão de bug bounty | [GitHub Security Advisories](https://github.com/roberto-sena89/viverderendaem15anos/security/advisories/new) |
| Dúvidas sobre o programa | security@roberto-sena89.github.io |
| Emergência (vuln ativa em produção) | Abra advisory + marque @roberto-sena89 |

---

## Changelog

| Data | Versão | Mudanças |
|------|--------|----------|
| 2026-08-17 | 1.0 | Lançamento do programa |

---

## Referências

- [SECURITY.md](SECURITY.md) — Política de segurança geral
- [GitHub Bug Bounty Best Practices](https://docs.github.com/en/code-security/security-advisories)
- [CVSS 4.0 Calculator](https://www.first.org/cvss/calculator/4.0)
- [HackerOne Disclosure Guidelines](https://www.hackerone.com/disclosure-guidelines)