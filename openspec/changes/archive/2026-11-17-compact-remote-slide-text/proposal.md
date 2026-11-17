## Why

O controle mostra as notas, mas não o texto projetado. O apresentador precisa consultar ambos no celular, enquanto cabeçalho, seleção de slide e botões consomem a maior parte da tela pequena.

## What Changes

- Enviar o texto visível do slide atual junto com título e notas, usando o HTML da apresentação como fonte única.
- Mostrar o texto acima das notas no controle e limpar ambos quando a conexão cair.
- Compactar o cabeçalho e a seleção de slide; manter os botões de avançar e voltar acessíveis mesmo quando o conteúdo exigir rolagem.

## Capabilities

### Modified Capabilities

- `remote-control`: sincronização do texto projetado e layout de leitura móvel.

## Impact

Afeta `app.js`, `remote.html`, `styles.css`, os testes do controle e a documentação do projeto. Não altera o transporte WebRTC nem os comandos disponíveis.
