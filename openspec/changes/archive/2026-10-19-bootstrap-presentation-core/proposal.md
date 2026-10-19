# Proposal

## Why

O novo projeto precisa reutilizar a infraestrutura de slides do Montreal Fireworks sem carregar o conteúdo e as credenciais temporárias da apresentação anterior.

## What Changes

- Criar uma apresentação estática com um único slide de preenchimento, preparada para receber conteúdo de cultura brasileira.
- Manter navegação Reveal.js, QR code e controle remoto opcional por Ably.
- Remover imagens, mapas, bandeiras, efeito de fogos, textos do evento antigo e tokens embutidos.
- Documentar edição, execução e configuração segura da autenticação remota.

## Capabilities

### New Capabilities

- `slide-presentation`: exibição e navegação dos slides sem etapa de build.
- `remote-control`: sessão compartilhada e comandos remotos, com indisponibilidade explícita quando não configurado.

### Modified Capabilities

Nenhuma.

## Impact

Novo repositório estático com `index.html`, `remote.html`, `app.js`, `config.js`, `styles.css`, bibliotecas locais e documentação. Ably permanece uma integração opcional e requer serviço de tokens externo.
