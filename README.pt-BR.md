# Album Copa 2026 Local

[English](README.md)

Aplicativo web local para controlar figurinhas do album Panini da Copa 2026 pelo computador.

O app roda no navegador, salva automaticamente no IndexedDB e permite exportar backup JSON e relatorios em CSV, PDF e PNG.

## Funcionalidades

- Catalogo com 980 figurinhas.
- Organizacao por secoes, selecoes e grupos.
- Controle de quantidade por figurinha.
- Deteccao automatica de repetidas.
- Filtros por todas, faltantes, tenho, repetidas e especiais.
- Busca por codigo, nome ou selecao.
- Entrada rapida por codigos colados.
- Modo pacotinho com 7 figurinhas.
- Estatisticas gerais e por selecao.
- Bandeiras por selecao usando icones SVG.
- Backup JSON com restauracao por substituicao ou mesclagem.
- Relatorios CSV, PDF e PNG.
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

Veja tambem: [docs/ARCHITECTURE.pt-BR.md](docs/ARCHITECTURE.pt-BR.md)

## Requisitos

- Node.js 22+ ou 24+
- npm

Para conferir:

```bash
node --version
npm --version
```

## Como Rodar Localmente

Guia passo a passo para usuarios menos tecnicos: [docs/INSTALL.pt-BR.md](docs/INSTALL.pt-BR.md)

Instale as dependencias:

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

Use sempre o mesmo endereco (`localhost` ou `127.0.0.1`), porque o IndexedDB e salvo por origem do navegador.

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

Gera a versao de producao em `dist/`.

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

Executa testes unitarios.

```bash
npm audit --audit-level=moderate
```

Verifica vulnerabilidades conhecidas nas dependencias.

## Dados E Backup

Os dados do usuario ficam salvos localmente no navegador via IndexedDB.

Para portabilidade, use a tela **Backup**:

- **Exportar backup JSON**: gera um arquivo com seu progresso.
- **Recuperar dados**: importa um backup.
- **Substituir**: troca os dados atuais pelo arquivo.
- **Mesclar**: combina dados mantendo a maior quantidade por figurinha.

O backup valida o identificador do app, versao, album e codigos existentes no catalogo.

## Relatorios

Na tela **Relatorios**, escolha:

- conteudo: todas, faltantes, tenho, repetidas ou especiais;
- secao: todas ou uma selecao especifica;
- formato: CSV, PDF ou PNG.

## Privacidade

O app nao usa login, backend, token ou chave de API. Nenhum dado pessoal e enviado para servidores durante o uso normal.

O arquivo `.env.example` existe apenas como placeholder. O app nao precisa de variaveis de ambiente.

## Aviso Legal

Este projeto e pessoal, nao oficial e nao possui afiliacao com FIFA, Panini ou organizadores da Copa do Mundo.

Por seguranca de publicacao, o repositorio nao inclui mascotes oficiais nem logos oficiais como assets proprietarios. A identidade visual do app e propria, e as bandeiras sao exibidas por icones SVG open-source.

## Licenca

Distribuido sob a licenca MIT. Veja [LICENSE](LICENSE).

## Antes De Publicar

Recomendado rodar:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Arquivos que nao devem subir estao no `.gitignore`, incluindo:

- `node_modules/`
- `dist/`
- logs
- `.env`
- caches locais
- backups JSON exportados
- relatorios CSV, PDF e PNG exportados

## Observacoes

Este e um projeto pessoal/hobby para controle local de colecao.
