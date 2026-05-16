# Arquitetura

[English](ARCHITECTURE.md)

Este projeto e um aplicativo web local para controle de figurinhas do album Panini da Copa 2026. A aplicacao roda no navegador, nao precisa de backend e armazena os dados do usuario localmente.

## Tecnologias

- React: interface e estado da aplicacao.
- TypeScript: tipagem do dominio, catalogo e exportacoes.
- Vite: servidor local de desenvolvimento e build.
- Dexie/IndexedDB: banco local do navegador para progresso do album.
- jsPDF: geracao de relatorios PDF sob demanda.
- Canvas API: geracao de relatorios PNG.
- flag-icons: icones SVG de bandeiras com renderizacao consistente entre plataformas.
- CSS nativo: layout, tema claro/escuro e responsividade.
- Vitest: testes unitarios de regras de negocio e relatorios.

## Visao Geral

```txt
src/
  backup/       validacao, importacao e exportacao de backup JSON
  components/   componentes reutilizaveis de interface
  pages/        telas principais do app
  data/         catalogo do album, grupos e metadados
  db/           Dexie, IndexedDB e operacoes de persistencia
  domain/       regras de negocio pequenas, como estatisticas e entrada rapida
  reports/      montagem de dados e exportadores CSV/PDF/PNG
  App.tsx       composicao das telas e fluxos principais
```

O catalogo de figurinhas fica versionado em `src/data/catalog.ts`. O progresso do usuario nao fica nesse arquivo: ele e salvo no IndexedDB do navegador.

## Dados

O catalogo usa os principais modelos:

- `Sticker`: identificador, codigo visivel, secao/selecao, numero, nome, tipo, especial e ordem.
- `StickerSection`: secao do album, como `PANINI`, `FWC`, `BRA`, `ARG`.
- `InventoryItem`: quantidade local do usuario para cada figurinha.

Codigos sao normalizados sem espaco, por exemplo:

- `BRA 1` vira `BRA1`
- `FWC 3` vira `FWC3`

## Persistencia

A aplicacao usa IndexedDB via Dexie. O banco local se chama `album-copa-2026` e possui duas tabelas:

- `inventory`: quantidades das figurinhas.
- `meta`: preferencias e datas, como apelido do album e ultimo salvamento.

Cada clique em `+`, `-`, entrada rapida ou pacotinho salva automaticamente no navegador.

## Backup

O backup JSON e o formato portavel dos dados do usuario. Ele inclui:

- identificador do app;
- versao do backup;
- id do album;
- data de exportacao;
- preferencias;
- inventario.

Na importacao, o app valida:

- se o arquivo pertence a este app;
- se a versao e compativel;
- se os codigos existem no catalogo;
- se as quantidades sao validas;
- se ha duplicados no arquivo.

Modos suportados:

- Substituir: troca o inventario atual pelo backup.
- Mesclar: mantem a maior quantidade para cada figurinha.

## Relatorios

Os relatorios usam os dados atuais do catalogo + inventario local e podem ser filtrados por:

- todas;
- faltantes;
- tenho;
- repetidas;
- especiais;
- secao/selecao.

Formatos:

- CSV: planilhas.
- PDF: relatorio paginado.
- PNG: imagem compartilhavel.

## Privacidade E Seguranca

O app nao precisa de login, token, chave de API ou `.env` para funcionar. Os dados do usuario ficam no navegador local e so saem do computador quando o proprio usuario exporta um arquivo.

O projeto nao inclui mascotes oficiais ou logos oficiais proprietarios. A identidade visual incluida no repositorio e propria do app; bandeiras sao renderizadas por icones SVG open-source.

Arquivos ignorados pelo Git:

- `node_modules/`
- `dist/`
- logs (`*.log`)
- arquivos `.env`
- caches locais
- backups JSON exportados pelo app
- relatorios CSV, PDF e PNG exportados pelo app

Antes de publicar, os comandos recomendados sao:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Atualizacao Do Catalogo

O script `scripts/generate-catalog.mjs` foi usado para gerar o catalogo local a partir de uma fonte publica. Ele valida a contagem total esperada antes de sobrescrever `src/data/catalog.ts`.

Como o catalogo fica versionado, o app nao depende de internet durante o uso normal.
