# Spec Delta

## MODIFIED Requirements

### Requirement: Sessão e acesso ao controle
O sistema SHALL gerar uma sessão aleatória para a apresentação e oferecer um link e QR code para o controle remoto dessa mesma sessão. O pareamento SHALL funcionar sem implantar servidor próprio ou configurar credenciais no site.

#### Scenario: Nova apresentação
- **WHEN** a apresentação é aberta sem sessão válida na URL
- **THEN** uma sessão nova é gerada e o link do controle contém o mesmo identificador

#### Scenario: Pareamento sem configuração
- **WHEN** a apresentação e o controle abrem com acesso ao serviço público de sinalização
- **THEN** eles podem estabelecer uma conexão direta sem configurar token ou endpoint próprio

## ADDED Requirements

### Requirement: Estado da conexão
O sistema SHALL indicar quando o serviço de pareamento ou a conexão direta estiver indisponível e SHALL manter os botões de envio desabilitados até a conexão estar ativa.

#### Scenario: Conexão indisponível
- **WHEN** o controle não consegue estabelecer ou perde a conexão com a apresentação
- **THEN** ele informa o problema, desabilita os comandos e tenta reconectar

## REMOVED Requirements

### Requirement: Indisponibilidade segura
**Reason**: A indisponibilidade não depende mais de configurar autenticação Ably; o requisito foi substituído pelo estado da conexão P2P.
**Migration**: Verificar `Estado da conexão` para o novo comportamento de falha e reconexão.
