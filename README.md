# Cultura Brasileira

Base de apresentação estática para GitHub Pages, derivada do projeto [Montreal Fireworks](https://github.com/jesjobom/montreal-fireworks). O conteúdo, imagens e efeitos ligados aos fogos foram removidos; o projeto mantém Reveal.js, navegação por slides, QR code e a estrutura do controle remoto.

## Começar

1. Abra `index.html` em um servidor HTTP local (por exemplo, `python3 -m http.server 8000`).
2. Substitua a seção de exemplo dentro de `.slides` em `index.html` pelos slides novos. Cada `<section>` é um slide; elementos com a classe `fragment` aparecem em sequência.
3. Coloque imagens novas em `assets/` e ajuste `styles.css` conforme o conteúdo. Não há build nem instalação de dependências para executar a apresentação.

Apresentação publicada: [abrir no GitHub Pages](https://jesjobom.github.io/brazilian-culture/).

Para verificar as rotinas de sessão e controle remoto, execute `node --test tests/*.test.cjs` (Node.js 20 ou superior). A interface também pode ser verificada abrindo as duas páginas no navegador.

## Controle remoto

A apresentação gera um ID de sessão aleatório na URL e mostra um QR code que abre `remote.html` na mesma sessão. O controle suporta próximo, anterior e ir para um slide. Não é necessário criar conta, configurar tokens ou implantar um servidor próprio: o [PeerJS Cloud](https://peerjs.com/client/faq) faz a sinalização inicial, e os comandos trafegam diretamente entre os navegadores por WebRTC.

O link da sessão funciona como chave de acesso ao controle; compartilhe-o apenas com quem deve controlar a apresentação. Ambos os dispositivos precisam de acesso à internet para o pareamento. Em algumas combinações de redes/NATs, a conexão direta pode falhar sem um serviço TURN. O PeerJS Cloud é gratuito e não oferece garantia de disponibilidade para uma apresentação crítica; nesse caso, um serviço gerenciado como Firebase Realtime Database é uma alternativa mais previsível, também sem servidor próprio.

## Arquivos

- `index.html`: slides e painel do apresentador.
- `remote.html`: interface móvel do controle.
- `app.js`: Reveal.js, sessões, QR code e controle WebRTC.
- `styles.css`: estilos base.
- `vendor/`: Reveal.js, QRious e PeerJS mantidos localmente, com licença do PeerJS.
- `openspec/`: especificações e histórico de mudanças.
