# Design

## Context

O site roda em GitHub Pages, sem backend. A implementação inicial exigia URLs de autenticação Ably, enquanto o requisito principal é não implantar serviço próprio.

## Goals / Non-Goals

**Goals:** controle funcional sem configuração de conta ou credenciais; manter navegação local independente; sinalizar falhas e reconectar.

**Non-Goals:** garantir conexão em toda topologia de NAT sem TURN, oferecer SLA de sinalização ou impedir acesso de quem possui o link da sessão.

## Decisions

- Usar PeerJS 1.5.5 localmente e o PeerJS Cloud apenas para sinalização. O fluxo pequeno de comandos passa por um DataChannel WebRTC criptografado. Alternativa: Firebase Realtime Database, mais previsível entre redes, mas requer projeto, regras de acesso e configuração manual.
- Usar ID de sessão aleatório de 128 bits como parte do ID do apresentador. O QR compartilha esse identificador com o controle. Quem possui o link pode controlar os slides.
- Desabilitar comandos até o DataChannel abrir e repetir o pareamento após falha. A apresentação local continua funcional mesmo sem conexão.

## Risks / Trade-offs

- [Redes com NAT simétrico podem impedir P2P] → informar limitação; para cenários críticos, avaliar TURN gerenciado ou Firebase.
- [PeerJS Cloud é serviço público sem SLA contratado] → não prometer disponibilidade e manter navegação local como fallback.
- [Link compartilhado autoriza controle] → usar sessão aleatória de alta entropia e documentar a necessidade de guardar o link.

## Migration Plan

Publicar os arquivos estáticos novos no mesmo branch. Nenhuma migração de dados; reversão por commit anterior se necessário.
