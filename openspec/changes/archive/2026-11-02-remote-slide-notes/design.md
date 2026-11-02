# Design

## Context

O site é estático e o apresentador já mantém o slide efetivamente visível no Reveal.js. Os comandos `next`, `prev` e `goto` não são estado: uma tecla ou um fragmento pode mudar o resultado sem passar pelo controle.

## Goals / Non-Goals

**Goals:** notas curtas no controle, sincronizadas com a apresentação após conexão, navegação e reconexão; uma única fonte para o texto das notas.

**Non-Goals:** edição de notas pelo celular, persistência, suporte a slides verticais ou garantia de conectividade além da atual.

## Decisions

- As notas ficam em listas HTML ocultas dentro de cada `<section>` da apresentação. Assim acompanham o slide quando ele é reordenado e não dependem de um segundo mapa por índice.
- O apresentador envia `{ action: 'slide-state', h, title, notes }` ao abrir o DataChannel e em `slidechanged`. Continua aceitando `next`, `prev` e `goto`; não há motivo para substituir comandos relativos por números.
- O controle usa apenas mensagens do apresentador para indicar o slide atual, renderiza texto com `textContent` e esconde a indicação atual quando perde a conexão.

## Risks / Trade-offs

- [Mudanças de fragmento não enviam novo estado] → as notas são por slide, não por fragmento; isso é intencional.
- [Notas no HTML público] → são conteúdo de apresentação, não devem conter informações privadas.

## Migration Plan

Publicar os arquivos estáticos. Não há migração nem mudança na sessão ou no transporte.
