# Cultura Brasileira

Base de apresentação estática para GitHub Pages, derivada do projeto [Montreal Fireworks](https://github.com/jesjobom/montreal-fireworks). O conteúdo, imagens e efeitos ligados aos fogos foram removidos; o projeto mantém Reveal.js, navegação por slides, QR code e a estrutura do controle remoto.

## Começar

1. Abra `index.html` em um servidor HTTP local (por exemplo, `python3 -m http.server 8000`).
2. Adicione os próximos slides dentro de `.slides` em `index.html` após a capa. Cada `<section>` é um slide; elementos com a classe `fragment` aparecem em sequência.
3. Coloque imagens novas em `assets/` e ajuste `styles.css` conforme o conteúdo. Não há build nem instalação de dependências para executar a apresentação.

Apresentação publicada: [abrir no GitHub Pages](https://jesjobom.github.io/brazilian-culture/).

Para verificar as rotinas de sessão e controle remoto, execute `node --test tests/*.test.cjs` (Node.js 20 ou superior). A interface também pode ser verificada abrindo as duas páginas no navegador.

## Controle remoto

A apresentação gera um ID de sessão aleatório na URL e mostra um QR code que abre `remote.html` na mesma sessão. O controle suporta próximo, anterior e ir para um slide. Não é necessário criar conta, configurar tokens ou implantar um servidor próprio: o [PeerJS Cloud](https://peerjs.com/client/faq) faz a sinalização inicial, e os comandos trafegam diretamente entre os navegadores por WebRTC.

O link da sessão funciona como chave de acesso ao controle; compartilhe-o apenas com quem deve controlar a apresentação. Ambos os dispositivos precisam de acesso à internet para o pareamento. Em algumas combinações de redes/NATs, a conexão direta pode falhar sem um serviço TURN. O PeerJS Cloud é gratuito e não oferece garantia de disponibilidade para uma apresentação crítica; nesse caso, um serviço gerenciado como Firebase Realtime Database é uma alternativa mais previsível, também sem servidor próprio.

No painel do apresentador, **Conexão do controle** oferece três modos. **Automático** tenta conexão direta e pode recorrer ao TURN do Metered; **Direto** usa apenas STUN; **Somente TURN (TLS/443)** força o relay para testar redes restritivas. Mudar o modo recarrega a apresentação, mantendo a sessão e o slide, e gera um novo QR code com o modo correspondente. Abra novamente o controle após a troca. As credenciais TURN estão no JavaScript público, conforme a configuração fornecida para este teste; limite a quota no Metered e desative ou troque a credencial quando não for mais necessária. O TURN não substitui a sinalização PeerJS.

## Arquivos

- `index.html`: slides e painel do apresentador.
- `remote.html`: interface móvel do controle.
- `app.js`: Reveal.js, sessões, QR code e controle WebRTC.
- `styles.css`: estilos base.
- `assets/brazil-fingerprint.png`: imagem da capa, obtida da [Uninter](https://www.uninter.com/noticias/wp-content/uploads/2021/05/noticias_brazil-652855_1920-1024x1621.png).
- `vendor/`: Reveal.js, QRious e PeerJS mantidos localmente, com licença do PeerJS.
- `openspec/`: especificações e histórico de mudanças.
