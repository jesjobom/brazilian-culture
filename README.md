# Cultura Brasileira

Base de apresentação estática para GitHub Pages, derivada do projeto [Montreal Fireworks](https://github.com/jesjobom/montreal-fireworks). O conteúdo, imagens e efeitos ligados aos fogos foram removidos; o projeto mantém Reveal.js, navegação por slides, QR code e a estrutura do controle remoto.

## Começar

1. Abra `index.html` em um servidor HTTP local (por exemplo, `python3 -m http.server 8000`).
2. Substitua a seção de exemplo dentro de `.slides` em `index.html` pelos slides novos. Cada `<section>` é um slide; elementos com a classe `fragment` aparecem em sequência.
3. Coloque imagens novas em `assets/` e ajuste `styles.css` conforme o conteúdo. Não há build nem instalação de dependências para executar a apresentação.

Depois da publicação do branch `main` via GitHub Pages, a URL prevista é `https://jesjobom.github.io/brazilian-culture/`. É necessário habilitar Pages nas configurações do repositório.

Para verificar as rotinas de sessão e controle remoto, execute `node --test tests/*.test.cjs` (Node.js 20 ou superior). A interface também pode ser verificada abrindo as duas páginas no navegador.

## Controle remoto

A apresentação gera um ID de sessão aleatório na URL e mostra um QR code que abre `remote.html` na mesma sessão. O controle suporta próximo, anterior e ir para um slide. Sem autenticação Ably configurada, a apresentação continua funcionando pelo teclado, mas os botões remotos ficam indisponíveis.

Para ativar o controle, disponibilize um serviço que emita tokens Ably de curta duração e configure em `config.js` as URLs `presentationAuthUrl` e `remoteAuthUrl`. O serviço deve conceder à apresentação permissão de receber `command` e publicar/receber `presence`, e ao controle permissão de publicar `command` e `presence`, nos canais com prefixo `brazilian-culture:`. Configure o serviço para aceitar somente origens e sessões esperadas. **Não coloque API keys ou tokens de longa duração no repositório ou no JavaScript servido pelo Pages.**

## Arquivos

- `index.html`: slides e painel do apresentador.
- `remote.html`: interface móvel do controle.
- `app.js`: Reveal.js, sessões, QR code e integração opcional com Ably.
- `config.js`: configuração pública dos endpoints de autenticação.
- `styles.css`: estilos base.
- `vendor/`: Reveal.js e QRious mantidos localmente.
- `openspec/`: especificações e histórico de mudanças.
