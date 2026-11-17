## Why

Uma falha no pareamento impede hoje até a leitura das notas, apesar de elas estarem no site estático. O apresentador precisa continuar consultando texto e notas no celular sem controlar a apresentação.

## What Changes

- Carregar antecipadamente o conteúdo dos slides da página da apresentação no controle.
- Oferecer navegação local por anterior, próximo e número do slide quando não houver conexão com a apresentação.
- Distinguir claramente a consulta local do slide sincronizado; ao reconectar, o estado real da apresentação volta a prevalecer.
- Manter comandos à apresentação indisponíveis durante a falha e continuar tentando reconectar.

## Capabilities

### Modified Capabilities

- `remote-control`: leitura e navegação local durante falha de conexão.

## Impact

Afeta `app.js`, teste do controle, versão de cache em `index.html` e `remote.html`, documentação e contrato. Não altera o transporte WebRTC nem o conteúdo dos slides.
