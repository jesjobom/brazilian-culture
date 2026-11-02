# Proposal

## Why

O controle remoto só envia comandos; ele não sabe qual slide está visível quando o apresentador navega pelo teclado ou após uma reconexão. Isso impede mostrar notas corretas para o slide atual.

## What Changes

- Guardar notas estáticas como bullets junto ao conteúdo de cada slide.
- Enviar o estado do slide do apresentador ao controle na conexão e sempre que o slide mudar.
- Mostrar no controle o título, número e notas do slide atual, sem alterar os comandos de navegação existentes.
- Limpar a indicação de slide atual quando a conexão cair e restaurá-la após reconectar.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `remote-control`: passa a receber o estado do slide exibido e a mostrar notas estáticas correspondentes.

## Impact

`index.html`, `remote.html`, `app.js`, `styles.css`, testes e documentação. O transporte PeerJS/WebRTC e a navegação local não mudam.
