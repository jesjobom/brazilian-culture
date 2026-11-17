# remote-control Specification

## Purpose
Permitir que um dispositivo móvel controle a apresentação por uma sessão compartilhada, sem bloquear a apresentação quando o serviço remoto estiver indisponível.

## Requirements

### Requirement: Sessão e acesso ao controle
O sistema SHALL gerar uma sessão aleatória para a apresentação e oferecer um link e QR code para o controle remoto dessa mesma sessão. O pareamento SHALL funcionar sem implantar servidor próprio ou configurar credenciais no site.

#### Scenario: Nova apresentação
- **WHEN** a apresentação é aberta sem sessão válida na URL
- **THEN** uma sessão nova é gerada e o link do controle contém o mesmo identificador

#### Scenario: Pareamento sem configuração
- **WHEN** a apresentação e o controle abrem com acesso ao serviço público de sinalização
- **THEN** eles podem estabelecer uma conexão direta sem configurar token ou endpoint próprio

### Requirement: Comandos de navegação
O controle remoto SHALL oferecer comandos para avançar, voltar e ir para um número válido de slide quando estiver conectado.

#### Scenario: Controle conectado
- **WHEN** o usuário aciona um comando válido no controle conectado
- **THEN** a apresentação da mesma sessão executa a navegação solicitada

### Requirement: Estado da conexão
O sistema SHALL indicar quando o serviço de pareamento ou a conexão direta estiver indisponível e SHALL impedir o envio de comandos à apresentação até a conexão estar ativa. Se o conteúdo local tiver sido carregado, os botões de navegação SHALL continuar disponíveis para consulta local, sem mover a apresentação.

#### Scenario: Conexão indisponível
- **WHEN** o controle não consegue estabelecer ou perde a conexão com a apresentação
- **THEN** ele informa o problema, não envia comandos à apresentação e tenta reconectar
- **AND** se o conteúdo local estiver disponível, permite navegar por ele com indicação de consulta local

### Requirement: Notas sincronizadas com o slide atual
O apresentador SHALL enviar ao controle conectado o índice, título, texto visível e notas estáticas do slide visível, exceto texto em elementos explicitamente marcados para exclusão do controle. O controle SHALL mostrar o texto recebido acima das notas do slide atual, SHALL distinguir conteúdo sincronizado de consulta local e SHALL indicar quando nenhum dos dois está disponível.

#### Scenario: Controle conecta durante a apresentação
- **WHEN** o canal de dados abre enquanto qualquer slide está visível
- **THEN** o controle recebe e mostra o título, texto visível não excluído e notas desse slide, sem precisar avançar ou voltar

#### Scenario: Slide muda localmente ou por comando remoto
- **WHEN** o apresentador muda de slide pelo teclado ou por um comando do controle
- **THEN** o controle mostra o título, número, texto visível não excluído e notas do novo slide

#### Scenario: Conexão perdida e retomada
- **WHEN** a conexão cai
- **THEN** o controle deixa de apresentar o texto e as notas antigas como estado atual confirmado da apresentação e mostra a consulta local no último slide conhecido, se disponível
- **WHEN** a conexão é restabelecida e chega o estado do slide visível
- **THEN** o apresentador envia novamente o estado do slide visível e o controle substitui a consulta local por esse estado, sem aplicar navegação offline à apresentação

#### Scenario: Slide sem notas
- **WHEN** o slide visível não contém notas
- **THEN** o controle mostra o texto visível não excluído e uma indicação de ausência de notas sem apresentar notas de outro slide

#### Scenario: Texto do slide
- **WHEN** o apresentador envia o estado de um slide
- **THEN** o texto projetado em títulos, parágrafos, itens de lista e legendas é incluído em ordem, sem incluir notas ocultas, textos de imagens nem elementos marcados com `data-remote-exclude`

#### Scenario: Lista de nacionalidades do slide 1
- **WHEN** o slide 1 é projetado e seu estado é enviado ao controle
- **THEN** a lista de nacionalidades e sua observação sobre tamanhos permanecem no slide projetado, mas não aparecem no texto do controle

### Requirement: Leitura compacta no controle móvel
O controle SHALL priorizar a leitura do texto e das notas e SHALL manter os comandos de avançar e voltar acessíveis sem rolar a página inteira. A seleção numérica de slide SHALL continuar disponível sem ocupar a área principal quando não está em uso.

#### Scenario: Conteúdo maior que a tela
- **WHEN** o texto e as notas não cabem na altura disponível
- **THEN** apenas a área de leitura rola, enquanto os botões de avançar e voltar permanecem visíveis

#### Scenario: Seleção numérica opcional
- **WHEN** o usuário precisa ir diretamente a um slide
- **THEN** pode abrir a seleção numérica compacta e enviar o comando como antes

### Requirement: Consulta local das notas
O controle SHALL carregar o conteúdo dos slides da apresentação estática ao abrir e SHALL permitir consultar texto e notas localmente quando não estiver conectado à apresentação, sem depender do pareamento.

#### Scenario: Pareamento falha antes da primeira conexão
- **WHEN** o conteúdo dos slides foi carregado e o controle não consegue parear
- **THEN** o usuário pode navegar pelas notas e textos com anterior, próximo ou número do slide, sem mover a apresentação

#### Scenario: Limites da navegação local
- **WHEN** o usuário está no primeiro ou último slide da consulta local
- **THEN** o comando que sairia dos limites não muda o slide local

#### Scenario: Conteúdo local indisponível
- **WHEN** o controle não consegue carregar o HTML da apresentação e não recebe dados da apresentação conectada
- **THEN** ele informa que as notas locais estão indisponíveis, sem mostrar conteúdo antigo como atual
