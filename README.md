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

### Notas do slide no controle

O controle mostra o número, título e notas do slide que está **realmente visível** na apresentação. O apresentador envia esse estado ao conectar, em cada troca de slide (inclusive por teclado) e após reconectar; os comandos próximo/anterior/ir para slide continuam iguais. Se a conexão cair, o controle deixa de exibir as notas antigas como atuais.

As notas são bullets curtos e estáticos em francês, guardados dentro de cada `<section>` de `index.html` como `<aside class="remote-notes" hidden><ul><li>...</li></ul></aside>`. Para editar, altere os itens da lista do slide correspondente; para não mostrar notas, deixe a lista vazia. Elas fazem parte do HTML público, portanto não coloque informações privadas ali.

No painel do apresentador, **Conexão do controle** oferece três modos. **Automático** tenta conexão direta e pode recorrer ao TURN do Metered; **Direto** usa apenas STUN; **Somente TURN (TLS/443)** força o relay para testar redes restritivas. Mudar o modo recarrega a apresentação, mantém o painel aberto e cria uma nova sessão com QR code atualizado para evitar conflitos com a conexão anterior. Abra novamente o controle após a troca. As credenciais TURN estão no JavaScript público, conforme a configuração fornecida para este teste; limite a quota no Metered e desative ou troque a credencial quando não for mais necessária. O TURN não substitui a sinalização PeerJS.

## Arquivos

- `index.html`: slides e painel do apresentador.
- `remote.html`: interface móvel do controle.
- `app.js`: Reveal.js, sessões, QR code e controle WebRTC.
- `styles.css`: estilos base.
- `assets/brazil-fingerprint.png`: imagem da capa, obtida da [Uninter](https://www.uninter.com/noticias/wp-content/uploads/2021/05/noticias_brazil-652855_1920-1024x1621.png).
- `assets/diversidade-cultural-no-brasil.jpg`: imagem ilustrativa do slide sobre comunidades, obtida do [blog Quindim](https://quindim.com.br/blog/wp-content/uploads/2021/06/Diversidade-cultural-no-Brasil.jpg). Não representa pessoas ou comunidades específicas mencionadas no slide.
- `assets/torcedores-anhangabau.jpg`: foto de torcedores em São Paulo usada no slide sobre diversidade genética; imagem fornecida do [g1](https://g1.globo.com/sp/sao-paulo/noticia/2022/12/02/no-anhangabau-torcedores-prometem-raspar-cabelo-pedir-ficante-em-namoro-e-parar-de-fumar-se-o-brasil-trouxer-o-hexa.ghtml), crédito Fábio Tito/g1. A foto é ilustrativa: as pessoas retratadas não são participantes do estudo genômico.
- `assets/convite-festa.jpg`: versão otimizada da imagem enviada por JJ para o slide sobre horários sociais; esse assunto usa uma paleta própria em azul-carvão e dourado.
- `assets/caramelo-*.webp`: oito imagens enviadas por JJ para a colagem do slide do cachorro caramelo, otimizadas e salvas localmente para que a apresentação não dependa dos sites de origem. Veja as fontes abaixo.
- `assets/culinaria-*.webp`: cinco imagens enviadas por JJ para a colagem do slide sobre culinária, otimizadas e salvas localmente. Veja as fontes abaixo.
- `vendor/`: Reveal.js, QRious e PeerJS mantidos localmente, com licença do PeerJS.
- `openspec/`: especificações e histórico de mudanças.

## Imagens do slide do cachorro caramelo

Fontes na ordem da colagem:

1. [Miniatura Google — camisa do Brasil](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-KsG7i-chL9ipNlfFIfetYbKFiLBdj8lurk2cFz0eqhQ5t0SGslXACBI&s=10)
2. [iG — retrato na rua](https://i0.statig.com.br/bancodeimagens/2f/ym/i8/2fymi85z5vo5pcl5rsnsr3xgi.jpg)
3. [TudoCelular — nota fictícia](https://t2.tudocdn.net/536039?w=1920)
4. [Estadão — cores da bandeira](https://www.estadao.com.br/resizer/v2/GLAQZCER7JBMDPRWUTUG6SL25A.jpg?auth=4f4871c3c6b3b32534aae2f8c7484f75e2456e0dec814078233a44673a7ef9a7)
5. [Netflix — cartaz de *Caramelo*](https://dnm.nflximg.net/api/v6/_YyUT33Ze3kFXjMydIZFIm6ajHk/AAAABTeaU6SPxtwdvZxUZIWa4Ed2YiKDy0QN1cIxS3uttrih4eg1mayGnEHFE8lqvbP6swK2bFoPoJyaUE1cWQ585bqFSsRoq0uPMjGt.jpg?r=faa)
6. [Magnific — retrato](https://img.magnific.com/fotos-gratis/foto-vertical-de-um-cachorro-marrom-fofo-em-um-fundo-desfocado_181624-41411.jpg?semt=ais_hybrid&w=740&q=80)
7. [O Globo — cachorro no sofá](https://s2-oglobo.glbimg.com/JitLZV2-7-YPW53krGkCBST0nrU=/0x0:3714x5200/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_da025474c0c44edd99332dddb09cabe8/internal_photos/bs/2024/t/e/UZWXRiT6akygOmZNcjpw/107647411-sa-rio-de-janeiro-rj-10-07-2024-cachorros-caramelo-na-foto-alberto-pereira-com-sua-cadel-3-.jpg)
8. [Miniatura Google — cães na praia](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfHXoCToZQBZ_ktD5xOZBJp6c3sNMw_GxmCxKvp-5dcxH3bwBODZ_zFZM&s=10)

A nota de R$ 200 é uma montagem humorística, não uma cédula real. As miniaturas do Google não identificam a fonte original. Os links registram a procedência, não uma licença de republicação.

## Imagens do slide sobre culinária

Fontes na ordem da colagem:

1. [Agro20 — arroz, feijão, ovo e linguiça](https://files.agro20.com.br/uploads/2020/03/comidabrasileira3.jpg)
2. [Melhores Destinos — feijoada](https://www.melhoresdestinos.com.br/wp-content/uploads/2020/12/comidas-tipicas-capa2019-01.jpg)
3. [Viva a Cidade News — pizzas](https://vivaacidadenews.com.br/wp-content/uploads/2026/07/abertura.jpg)
4. [Estadão — pão de queijo](https://www.estadao.com.br/resizer/v2/GQBT6W6M2FCTBAHRCFPYPBN5IA.jpeg?auth=4f463f9950c33c9c5c3582930121a2b7e50c53ed29c151de3fdb2ca117578381)
5. [Tudo Online em Campo Bom — sushi](https://www.tudoonlineemcampobom.com.br/wp-content/uploads/2022/09/sushi-comercial-internet-tipos.jpg)

Os links registram a procedência, não uma licença de republicação.

## Fontes dos slides sobre diversidade

- A nuvem do primeiro slide usa **faixas visuais indicativas**, não áreas proporcionais nem categorias somáveis. As estimativas de descendência podem se sobrepor e têm metodologias diferentes. Para “afro-brasileiras”, o tamanho usa como aproximação os 112,7 milhões de pessoas que se declararam pretas ou pardas no [Censo 2022 do IBGE](https://sidra.ibge.gov.br/pesquisa/censo-demografico/demografico-2022/universo-populacao-por-cor-ou-raca); isso não é uma contagem exata de afrodescendentes.
- Italianos: mais de 30 milhões de descendentes, segundo a [Embaixada da Itália](https://ambbrasilia.esteri.it/pt/news/dall_ambasciata/2023/06/mensagem-do-embaixador-azzarello-a-comunidade-italiana-e-italo-brasileira-por-ocasiao-da-77a-festa-da-republica-2-de-junho-de-2023/). Árabes: cerca de 11,6 milhões, segundo [pesquisa Ibope/H2R encomendada pela Câmara Árabe-Brasileira](https://anba.com.br/en/arabs-descendants-are-6-of-brazils-population-survey/). Alemães: cerca de 6,1 milhões, segundo o [Parlamento alemão](https://www.bundestag.de/presse/hib/836702-836702).
- Japoneses: mais de 1,5 milhão, segundo o [Tribunal de Contas do Município de São Paulo](https://lgpd.tcm.sp.gov.br/Pagina/66368); a [Harvard ReVista](https://revista.drclas.harvard.edu/the-japanese-brazilian-community/) registra a maior comunidade de descendentes fora do Japão. Poloneses: estimativas de aproximadamente 0,8 a 3 milhões, conforme o [governo polonês](https://www.gov.pl/web/irjp/rozmowa-o-przyszlosci-jezyka-polskiego-w-brazylii) e a [Polish Academy of Sciences](https://journals.pan.pl/Content/131484/48-51_Radomski_EN.pdf?handler=pdf); por isso as duas tags têm o mesmo tamanho.
- [Nunes et al., *Science* (2025)](https://doi.org/10.1126/science.adl3564): o estudo descreve o Brasil como a maior população **recentemente miscigenada** do mundo; não afirma que seja a população de maior diversidade genética absoluta.
- [Jornal da USP](https://jornal.usp.br/ciencias/estudo-mapeia-impactos-da-miscigenacao-no-dna-e-na-saude-da-populacao-brasileira/): os percentuais 60%/27%/13% são médias dos 2.723 genomas analisados, não estimativas nacionais. Os resultados variam conforme a composição da amostra e a região.
