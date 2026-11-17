## Why

A lista de nacionalidades do slide 1 ocupa espaço no controle, embora seja útil na projeção. A nota correspondente também precisa refletir a formulação fornecida pelo apresentador.

## What Changes

- Omitir da transcrição enviada ao controle elementos explicitamente marcados com `data-remote-exclude`.
- Marcar a lista de nacionalidades do slide 1 e sua observação sobre tamanho para essa exclusão, mantendo ambas na apresentação.
- Substituir apenas a nota indicada, com correções ortográficas em francês.

## Capabilities

### Modified Capabilities

- `remote-control`: permitir exceções explícitas na transcrição de texto visível.

## Impact

Afeta `index.html`, `app.js`, `remote.html` (versão de cache do script), teste de sincronização e documentação. Não altera navegação nem transporte.
