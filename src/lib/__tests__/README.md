# Testes de Modelos Gratuitos

Este diretório contém testes para validar que os modelos listados como gratuitos em `provedor-ia.ts` são realmente gratuitos segundo as APIs dos provedores.

## Como usar

### Executando o teste de modelos gratuitos

```bash
# Executa o teste que valida se os modelos configurados como gratuitos são realmente gratuitos
npm run test:modelos

# Alternativamente, você pode executar diretamente com bun
bun test:modelos
```

### O que o teste verifica

O teste compara duas fontes de informação:

1. **Modelos configurados** - Os modelos listados como gratuitos em `src/lib/provedor-ia.ts`
2. **Modelos verificados** - Os modelos que a verificação real das APIs determina como gratuitos

O teste passa se e somente se **todos** os modelos configurados como gratuitos forem realmente gratuitos segundo a verificação da API.

### Saída do teste

Quando executado, o teste mostra:

- Para cada provedor:
  - Status da verificação (OK, SEM CHAVE, ERRO)
  - Número de modelos configurados vs verificados como gratuitos
  - Detalhes de quais modelos configurados não são realmente gratuitos (se houver)
  - Detalhes de quais modelos gratuitos não estão configurados como gratuitos (aviso)

- Resumo final com:
  - Total de modelos configurados
  - Total de modelos verificados como gratuitos
  - Número de erros encontrados
  - Resultado final (PASSOU/FALHOU)

### Quando executar

- **Antes de fazer commit** - Sempre execute este teste após modificar `provedor-ia.ts`
- **Em CI/CD** - Pode ser integrado ao pipeline de build
- **Periodicamente** - Pode ser executado como parte de um agendamento para detectar mudanças nas APIs dos provedores

## Como funciona

O teste usa as mesmas funções de verificação do sistema existente:
- `modelosConfiguradosDe()` - Extrai os modelos configurados de provedor-ia.ts
- `verificarModelosGratuitos()` - Consulta as APIs reais dos provedores para determinar quais modelos são realmente gratuitos

Este é o mesmo mecanismo usado pelo script `scripts/verificar-modelos.ts` que gera o relatório de modelos gratuitos.

## Interpretação de resultados

✅ **TESTE PASSOU**: Todos os modelos marcados como gratuitos são realmente gratuitos
- Seguro para fazer commit
- Nenhum modelo não gratuito está sendo anunciado como gratuito

❌ **TESTE FALHOU**: Alguns modelos não gratuitos estão marcados como gratuitos
- **Não fazer commit** até corrigir o provedor-ia.ts
- Remover os modelos incorretos da lista de modelos gratuitos
- Executar o teste novamente para confirmar a correção

⚠️ **AVISOS**: Modelos gratuitos que não estão configurados como gratuitos
- Não impede o teste de passar
- Indica oportunidades para melhorar a cobertura dos modelos gratuitos listados
- Pode ser investigado para atualizar o provedor-ia.ts com novos modelos gratuitos descobertos