## MODIFIED Requirements

### Requirement: Notas sincronizadas com o slide atual
O apresentador SHALL enviar ao controle conectado o índice, título, texto visível e notas estáticas do slide visível, exceto texto em elementos explicitamente marcados para exclusão do controle. O controle SHALL mostrar o texto recebido acima das notas do slide atual e SHALL indicar quando esse estado não está disponível.

#### Scenario: Controle conecta durante a apresentação
- **WHEN** o canal de dados abre enquanto qualquer slide está visível
- **THEN** o controle recebe e mostra o título, texto visível não excluído e notas desse slide, sem precisar avançar ou voltar

#### Scenario: Slide muda localmente ou por comando remoto
- **WHEN** o apresentador muda de slide pelo teclado ou por um comando do controle
- **THEN** o controle mostra o título, número, texto visível não excluído e notas do novo slide

#### Scenario: Conexão perdida e retomada
- **WHEN** a conexão cai
- **THEN** o controle deixa de apresentar o texto e as notas antigas como atuais
- **WHEN** a conexão é restabelecida
- **THEN** o apresentador envia novamente o estado do slide visível

#### Scenario: Slide sem notas
- **WHEN** o slide visível não contém notas
- **THEN** o controle mostra o texto visível não excluído e uma indicação de ausência de notas sem apresentar notas de outro slide

#### Scenario: Texto do slide
- **WHEN** o apresentador envia o estado de um slide
- **THEN** o texto projetado em títulos, parágrafos, itens de lista e legendas é incluído em ordem, sem incluir notas ocultas, textos de imagens nem elementos marcados com `data-remote-exclude`

#### Scenario: Lista de nacionalidades do slide 1
- **WHEN** o slide 1 é projetado e seu estado é enviado ao controle
- **THEN** a lista de nacionalidades e sua observação sobre tamanhos permanecem no slide projetado, mas não aparecem no texto do controle
