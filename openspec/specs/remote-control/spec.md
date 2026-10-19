# remote-control Specification

## Purpose
Permitir que um dispositivo móvel controle a apresentação por uma sessão compartilhada, sem bloquear a apresentação quando o serviço remoto estiver indisponível.

## Requirements

### Requirement: Sessão e acesso ao controle
O sistema SHALL gerar uma sessão aleatória para a apresentação e oferecer um link e QR code para o controle remoto dessa mesma sessão.

#### Scenario: Nova apresentação
- **WHEN** a apresentação é aberta sem sessão válida na URL
- **THEN** uma sessão nova é gerada e o link do controle contém o mesmo identificador

### Requirement: Comandos de navegação
O controle remoto SHALL oferecer comandos para avançar, voltar e ir para um número válido de slide quando estiver conectado.

#### Scenario: Controle conectado
- **WHEN** o usuário aciona um comando válido no controle conectado
- **THEN** a apresentação da mesma sessão executa a navegação solicitada

### Requirement: Indisponibilidade segura
O sistema SHALL indicar quando a autenticação remota não está configurada e SHALL manter os botões de envio desabilitados até a conexão estar ativa.

#### Scenario: Sem autenticação configurada
- **WHEN** o controle abre sem endpoint de autenticação
- **THEN** ele informa que o controle não está configurado e não permite enviar comandos
