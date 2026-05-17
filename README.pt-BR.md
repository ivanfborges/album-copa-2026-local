# Álbum Copa 2026

[English](README.md)

Aplicativo web local para controlar figurinhas do álbum Panini da Copa 2026 pelo computador.

O app roda no navegador, salva automaticamente no IndexedDB e permite exportar backup JSON e relatórios em CSV, PDF, PNG, imagem para celular e texto para WhatsApp.

## Funcionalidades

- Catálogo com 980 figurinhas.
- Organização por seções, seleções e grupos.
- Controle de quantidade por figurinha.
- Detecção automática de repetidas.
- Filtros por todas, faltantes, tenho, repetidas e especiais.
- Filtro de especiais combinável com faltantes, tenho, repetidas ou todas.
- Busca por código, nome ou seleção.
- Entrada rápida para adicionar ou remover códigos colados.
- Modo pacotinho com 7 figurinhas.
- Estatísticas gerais e por seleção.
- Bandeiras por seleção usando ícones SVG.
- Backup JSON com restauração por substituição ou mesclagem.
- Relatórios compactos em CSV, PDF, PNG, imagem para celular e texto para WhatsApp, agrupados na ordem do álbum.
- Tema claro/escuro.

## Tecnologias

- React
- TypeScript
- Vite
- Dexie/IndexedDB
- jsPDF
- Canvas API
- flag-icons
- CSS nativo
- Vitest

Veja também: [docs/ARCHITECTURE.pt-BR.md](docs/ARCHITECTURE.pt-BR.md)

## Requisitos

- Node.js 22+ ou 24+
- npm

Para conferir:

```bash
node --version
npm --version
```

## Como Rodar Localmente

Guia passo a passo para usuários menos técnicos: [docs/INSTALL.pt-BR.md](docs/INSTALL.pt-BR.md)

Instale as dependências:

```bash
npm install
```

Inicie o servidor local:

```bash
npm run dev
```

Abra no navegador:

```txt
http://localhost:5173/
```

Use sempre o mesmo endereço (`localhost` ou `127.0.0.1`), porque o IndexedDB é salvo por origem do navegador.

Para parar o servidor:

```txt
Ctrl + C
```

## Scripts

```bash
npm run dev
```

Roda o app em desenvolvimento.

```bash
npm run build
```

Gera a versão de produção em `dist/`.

```bash
npm run preview
```

Previsualiza o build localmente.

```bash
npm run lint
```

Executa o ESLint.

```bash
npm test
```

Executa testes unitários.

```bash
npm audit --audit-level=moderate
```

Verifica vulnerabilidades conhecidas nas dependências.

## Dados E Backup

Os dados do usuário ficam salvos localmente no navegador via IndexedDB.

Para portabilidade, use a tela **Backup**:

- **Exportar backup JSON**: gera um arquivo com seu progresso.
- **Recuperar dados**: importa um backup.
- **Substituir**: troca os dados atuais pelo arquivo.
- **Mesclar**: combina dados mantendo a maior quantidade por figurinha.

O backup valida o identificador do app, versão, álbum e códigos existentes no catálogo.

## Relatórios

Na tela **Relatórios**, escolha:

- conteúdo: todas, faltantes, tenho, repetidas e filtro opcional de especiais;
- seção: todas ou uma seleção específica;
- formato: CSV, PDF, PNG, imagem para celular (`IMG/CEL`) ou texto para WhatsApp (`TXT/WPP`).

A prévia e todos os formatos de exportação usam um layout compacto agrupado na ordem do álbum. Cada seção mostra apenas os números das figurinhas do filtro selecionado, e relatórios de repetidas incluem quantidades como `7 (x2)`. O texto para WhatsApp começa com um marcador curto, como `🏆 Copa 2026`, seguido pela categoria selecionada.

## Privacidade

O app não usa login, backend, token ou chave de API. Nenhum dado pessoal é enviado para servidores durante o uso normal.

O arquivo `.env.example` existe apenas como placeholder. O app não precisa de variáveis de ambiente.

Imagens locais opcionais podem ser colocadas em `public/brand/` seguindo [public/brand/README.md](public/brand/README.md). Esses arquivos são ignorados pelo Git para evitar publicar imagens pessoais ou licenciadas por acidente.

## Aviso Legal

Este projeto é pessoal, não oficial e não possui afiliação com FIFA, Panini ou organizadores da Copa do Mundo.

Por segurança de publicação, o repositório não inclui mascotes oficiais nem logos oficiais como assets proprietários. A identidade visual do app é própria, e as bandeiras são exibidas por ícones SVG open-source.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

## Antes De Publicar

Recomendado rodar:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Arquivos que não devem subir estão no `.gitignore`, incluindo:

- `node_modules/`
- `dist/`
- logs
- `.env`
- caches locais
- backups JSON exportados
- relatórios CSV, PDF, PNG e textos para WhatsApp exportados

## Observações

Este é um projeto pessoal/hobby para controle local de coleção.
