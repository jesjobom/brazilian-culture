# Proposal

## Why

A primeira versão do controle remoto do novo projeto dependia de um endpoint próprio para emitir tokens Ably. Isso contraria o requisito de não implantar um servidor para a apresentação.

## What Changes

- Substituir o transporte Ably por conexão WebRTC entre apresentador e controle, com sinalização pública do PeerJS Cloud.
- Remover configuração de tokens e endpoints Ably.
- Preservar os comandos e o QR code existentes, com indicação clara de conexão e indisponibilidade.
- Documentar limites de conectividade P2P e a alternativa gerenciada para situações críticas.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `remote-control`: o pareamento e transporte passam a funcionar sem servidor próprio nem configuração de credenciais; a indisponibilidade passa a ser de conexão/sinalização.

## Impact

`app.js`, páginas HTML, testes, documentação e dependência local PeerJS. Nenhuma mudança no conteúdo dos slides.
