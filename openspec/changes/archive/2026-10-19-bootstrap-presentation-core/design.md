# Design

## Context

O projeto de origem é uma aplicação estática em Reveal.js com integração Ably e conteúdo de um evento específico. GitHub Pages não oferece backend para emitir tokens privados.

## Goals / Non-Goals

**Goals:** manter a infraestrutura estática e a API de comandos sem copiar conteúdo ou credenciais do projeto anterior.

**Non-Goals:** criar os slides definitivos ou operar um serviço de emissão de tokens Ably nesta etapa.

## Decisions

- Copiar somente os arquivos de distribuição do Reveal.js e o gerador local de QR. Alternativa considerada: copiar o repositório inteiro e apagar depois; isso preservaria conteúdo e tokens no histórico Git.
- Criar um histórico Git novo, apontando ao repositório novo. O projeto antigo permanece intacto e é citado no README.
- Usar endpoints de autenticação Ably em `config.js` e deixar a integração desligada por padrão. Alternativa considerada: reutilizar tokens temporários no JavaScript; isso exporia credenciais e falharia após sua expiração.
- Deixar um slide inicial mínimo para permitir verificar renderização e servir de ponto de substituição.

## Risks / Trade-offs

- [Controle remoto depende de serviço externo de tokens] → documentar configuração e indicar estado indisponível na interface.
- [O SDK Ably usa CDN] → navegação local permanece independente e o estado remoto informa quando a biblioteca está indisponível.

## Migration Plan

Publicar o branch `main` e habilitar GitHub Pages. Para voltar atrás, reverter o commit inicial no novo repositório; o projeto de origem não é alterado.
