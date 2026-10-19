# Spec Delta

## Purpose

Permitir apresentar e navegar por slides de uma página estática que possa receber novos conteúdos sem compilação ou servidor de aplicação.

## ADDED Requirements

### Requirement: Apresentação estática editável
O sistema SHALL exibir os slides definidos na página de apresentação, sem depender da integração remota para navegar localmente.

#### Scenario: Controle local sem Ably
- **WHEN** a página é aberta sem autenticação remota configurada
- **THEN** o slide inicial aparece e a navegação local permanece disponível

### Requirement: Conteúdo inicial independente
O repositório SHALL iniciar sem materiais visuais ou textos específicos do Montreal Fireworks, mantendo apenas um slide de preenchimento identificado com o novo projeto.

#### Scenario: Criação do projeto
- **WHEN** o repositório é clonado
- **THEN** não há imagens, mapas, bandeiras, animação de fogos ou textos do evento anterior entre os slides
