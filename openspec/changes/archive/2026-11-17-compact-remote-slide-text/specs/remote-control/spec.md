## MODIFIED Requirements

### Requirement: Notas sincronizadas com o slide atual
O apresentador SHALL enviar ao controle conectado o índice, título, texto visível e notas estáticas do slide visível. O controle SHALL mostrar o texto recebido acima das notas do slide atual e SHALL indicar quando esse estado não está disponível.

#### Scenario: Controle conecta durante a apresentação
- **WHEN** o canal de dados abre enquanto qualquer slide está visível
- **THEN** o controle recebe e mostra o título, texto visível e notas desse slide, sem precisar avançar ou voltar

#### Scenario: Slide muda localmente ou por comando remoto
- **WHEN** o apresentador muda de slide pelo teclado ou por um comando do controle
- **THEN** o controle mostra o título, número, texto visível e notas do novo slide

#### Scenario: Conexão perdida e retomada
- **WHEN** a conexão cai
- **THEN** o controle deixa de apresentar o texto e as notas antigas como atuais
- **WHEN** a conexão é restabelecida
- **THEN** o apresentador envia novamente o estado do slide visível

#### Scenario: Slide sem notas
- **WHEN** o slide visível não contém notas
- **THEN** o controle mostra o texto visível e uma indicação de ausência de notas sem apresentar notas de outro slide

#### Scenario: Texto do slide
- **WHEN** o apresentador envia o estado de um slide
- **THEN** o texto projetado em títulos, parágrafos, itens de lista e legendas é incluído em ordem, sem incluir notas ocultas nem textos de imagens

## ADDED Requirements

### Requirement: Leitura compacta no controle móvel
O controle SHALL priorizar a leitura do texto e das notas e SHALL manter os comandos de avançar e voltar acessíveis sem rolar a página inteira. A seleção numérica de slide SHALL continuar disponível sem ocupar a área principal quando não está em uso.

#### Scenario: Conteúdo maior que a tela
- **WHEN** o texto e as notas não cabem na altura disponível
- **THEN** apenas a área de leitura rola, enquanto os botões de avançar e voltar permanecem visíveis

#### Scenario: Seleção numérica opcional
- **WHEN** o usuário precisa ir diretamente a um slide
- **THEN** pode abrir a seleção numérica compacta e enviar o comando como antes
