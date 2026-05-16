# Arquitetura

[English](ARCHITECTURE.md)

Este projeto é um aplicativo web local para controle de figurinhas do álbum Panini da Copa 2026. A aplicação roda no navegador, não precisa de backend e armazena os dados do usuário localmente.

## Tecnologias

- React: interface e estado da aplicação.
- TypeScript: tipagem do domínio, catálogo e exportações.
- Vite: servidor local de desenvolvimento e build.
- Dexie/IndexedDB: banco local do navegador para progresso do álbum.
- jsPDF: geração de relatórios PDF sob demanda.
- Canvas API: geração de relatórios PNG.
- flag-icons: ícones SVG de bandeiras com renderização consistente entre plataformas.
- CSS nativo: layout, tema claro/escuro e responsividade.
- Vitest: testes unitários de regras de negócio, relatórios e exportações compactas.

## Visão Geral

```txt
src/
  backup/       validação, importação e exportação de backup JSON
  components/   componentes reutilizáveis de interface
  pages/        telas principais do app
  data/         catálogo do álbum, grupos, bandeiras e metadados
  db/           Dexie, IndexedDB e operações de persistência
  domain/       regras de negócio pequenas, como estatísticas e entrada rápida
  reports/      montagem de dados e exportadores CSV/PDF/PNG/mobile/WhatsApp
  App.tsx       composição das telas e fluxos principais
```

O catálogo de figurinhas fica versionado em `src/data/catalog.ts`. O progresso do usuário não fica nesse arquivo: ele é salvo no IndexedDB do navegador.

## Dados

O catálogo usa os principais modelos:

- `Sticker`: identificador, código visível, seção/seleção, número, nome, tipo, especial e ordem.
- `StickerSection`: seção do álbum, como `PANINI`, `FWC`, `BRA`, `ARG`.
- `InventoryItem`: quantidade local do usuário para cada figurinha.

Códigos são normalizados sem espaço, por exemplo:

- `BRA 1` vira `BRA1`
- `FWC 3` vira `FWC3`

## Persistência

A aplicação usa IndexedDB via Dexie. O banco local se chama `album-copa-2026` e possui duas tabelas:

- `inventory`: quantidades das figurinhas.
- `meta`: preferências e datas, como apelido do álbum e último salvamento.

Cada clique em `+`, `-`, entrada rápida, remoção rápida ou pacotinho salva automaticamente no navegador.

## Backup

O backup JSON é o formato portátil dos dados do usuário. Ele inclui:

- identificador do app;
- versão do backup;
- id do álbum;
- data de exportação;
- preferências;
- inventário.

Na importação, o app valida:

- se o arquivo pertence a este app;
- se a versão é compatível;
- se os códigos existem no catálogo;
- se as quantidades são válidas;
- se há duplicados no arquivo.

Modos suportados:

- Substituir: troca o inventário atual pelo backup.
- Mesclar: mantém a maior quantidade para cada figurinha.

## Relatórios

Os relatórios usam os dados atuais do catálogo + inventário local e podem ser filtrados por:

- todas;
- faltantes;
- tenho;
- repetidas;
- especiais;
- seção/seleção.

O filtro de especiais é aditivo, então pode ser combinado com faltantes, tenho, repetidas ou todas.

Formatos:

- CSV: planilhas.
- PDF: relatório paginado.
- PNG: imagem compartilhável.
- PNG celular (`IMG/CEL`): imagem vertical e compacta otimizada para consulta no celular durante trocas.
- Texto WhatsApp (`TXT/WPP`): texto compacto agrupado na ordem do álbum para compartilhar faltantes ou repetidas em conversas. Ele começa com um título com troféu e um marcador de categoria.

## Privacidade E Segurança

O app não precisa de login, token, chave de API ou `.env` para funcionar. Os dados do usuário ficam no navegador local e só saem do computador quando o próprio usuário exporta um arquivo.

O projeto não inclui mascotes oficiais ou logos oficiais proprietários. A identidade visual incluída no repositório é própria do app; bandeiras são renderizadas por ícones SVG open-source.

Imagens locais opcionais em `public/brand/` podem customizar a interface durante o uso pessoal. Esses arquivos são ignorados pelo Git por padrão.

Arquivos ignorados pelo Git:

- `node_modules/`
- `dist/`
- logs (`*.log`)
- arquivos `.env`
- caches locais
- backups JSON exportados pelo app
- relatórios CSV, PDF, PNG e textos para WhatsApp exportados pelo app
- imagens locais opcionais em `public/brand/`

Antes de publicar, os comandos recomendados são:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Atualização Do Catálogo

O script `scripts/generate-catalog.mjs` foi usado para gerar o catálogo local a partir de uma fonte pública. Ele valida a contagem total esperada antes de sobrescrever `src/data/catalog.ts`.

Como o catálogo fica versionado, o app não depende de internet durante o uso normal.
