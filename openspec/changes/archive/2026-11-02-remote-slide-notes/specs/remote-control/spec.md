## ADDED Requirements

### Requirement: Notas sincronizadas com o slide atual
O apresentador SHALL enviar ao controle conectado o índice, título e notas estáticas do slide visível. O controle SHALL mostrar apenas as notas recebidas para o slide atual e SHALL indicar quando esse estado não está disponível.

#### Scenario: Controle conecta durante a apresentação
- **WHEN** o canal de dados abre enquanto qualquer slide está visível
- **THEN** o controle recebe e mostra o estado desse slide, sem precisar avançar ou voltar

#### Scenario: Slide muda localmente ou por comando remoto
- **WHEN** o apresentador muda de slide pelo teclado ou por um comando do controle
- **THEN** o controle mostra o título, número e notas do novo slide

#### Scenario: Conexão perdida e retomada
- **WHEN** a conexão cai
- **THEN** o controle deixa de apresentar as notas antigas como atuais
- **WHEN** a conexão é restabelecida
- **THEN** o apresentador envia novamente o estado do slide visível

#### Scenario: Slide sem notas
- **WHEN** o slide visível não contém notas
- **THEN** o controle mostra uma indicação de ausência de notas sem apresentar notas de outro slide
