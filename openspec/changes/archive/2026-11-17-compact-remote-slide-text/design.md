## Context

O apresentador já lê o slide efetivamente visível no Reveal.js e envia um estado por WebRTC. Os textos estão no próprio HTML; manter uma cópia para o controle criaria divergência.

## Goals / Non-Goals

**Goals:** mostrar título, textos visíveis e notas do slide atual; preservar navegação ao alcance sem rolar a página inteira; reduzir a área de controles secundários.

**Non-Goals:** enviar imagens ou texto alternativo, editar conteúdo pelo controle, garantir que slides arbitrariamente longos caibam sem rolagem.

## Decisions

- Extrair, em ordem, texto de `h1`, `h2`, `p`, `li` e `figcaption` dentro do slide atual, excluindo as notas ocultas. Isso cobre todo o texto projetado nos slides existentes, inclusive legendas e rótulos, sem duplicá-lo no código.
- Enviar `slideText` como lista de blocos no estado do slide; o controle renderiza cada bloco com `textContent` e valida tamanho e tipo antes de exibir.
- Usar um painel móvel com área central rolável e rodapé de navegação sempre visível. Manter a seleção numérica dentro de um elemento expansível fechado por padrão.

## Risks / Trade-offs

- Slides ou notas extensos ainda exigem rolagem do texto, mas os botões de navegação não desaparecem.
- Texto adicionado futuramente em elementos fora dos seletores semânticos não será enviado; a documentação identifica a convenção de marcação.
