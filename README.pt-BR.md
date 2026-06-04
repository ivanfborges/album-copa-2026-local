# Álbum Copa 2026

[English](README.md)

Aplicativo web local para controlar figurinhas do álbum Panini da Copa 2026 pelo computador.

O app roda no navegador, salva automaticamente no IndexedDB e permite exportar backup JSON e relatórios em CSV, PDF, PNG, imagem para celular, folha A4 imprimível e texto para WhatsApp.

O chat de IA é opcional e roda por um `ai-service` local separado, mantendo o rastreador principal leve, offline-first e utilizável sem dependência de LLM.

## Funcionalidades

- Catálogo com 980 figurinhas.
- Organização por seções, seleções e grupos.
- Controle de quantidade por figurinha.
- Detecção automática de repetidas.
- Filtros por todas, faltantes, tenho, repetidas e especiais.
- Filtro de especiais combinável com faltantes, tenho, repetidas ou todas.
- Busca por código, nome ou seleção.
- Entrada rápida para adicionar ou remover códigos colados, mostrando quantas figurinhas são novas, quantas viram repetidas e destacando repetidas direto no campo de texto.
- Limpeza em massa de repetidas, removendo quantidades extras e mantendo uma unidade de cada figurinha.
- Modo pacotinho com 7 figurinhas, mostrando quantas são novas, quantas são repetidas e destacando repetidas direto no campo de texto antes de salvar.
- Estatísticas gerais e por seleção, com faixas de progresso para vazias, evoluindo, passaram da metade, quase completas e completas.
- Seção **AIvan** para funcionalidades orientadas a IA, incluindo previsão local de conclusão, ranking de trocas, próxima melhor ação, busca web opcional sobre a Copa 2026 e chat opcional que consulta tools determinísticas da coleção antes de responder.
- Histórico local de eventos da coleção para funcionalidades orientadas a IA, com rastreamento automático e marcos históricos opcionais.
- Bandeiras por seleção usando ícones SVG.
- Backup JSON com restauração por substituição ou mesclagem.
- Relatórios compactos em CSV, PDF, PNG, imagem para celular, folha A4 imprimível e texto para WhatsApp, agrupados na ordem do álbum.
- Checklists imprimíveis destacam figurinhas brilhantes (`FWC` e número `1` das seleções) e figurinhas de foto/formação do time (`13`) para facilitar conferência em trocas.
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
- Serviço opcional de IA: Python, FastAPI, Ollama e uma camada de agente preparada para LangGraph

Veja também: [docs/ARCHITECTURE.pt-BR.md](docs/ARCHITECTURE.pt-BR.md)

## Requisitos

- Node.js 22+ ou 24+
- npm
- Opcional para o chat do AIvan: Python 3.11+, Ollama e um modelo local como `qwen3:4b`

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
http://127.0.0.1:3001/
```

Use sempre o mesmo endereço (`127.0.0.1:3001`), porque o IndexedDB é salvo por origem do navegador.

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

Executa testes unitários e testes básicos de renderização das telas.

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

O backup valida o identificador do app, versão, álbum, códigos existentes no catálogo e eventos de histórico compatíveis.

## AIvan

A tela **AIvan** concentra a camada de decisão de IA do projeto:

- chat local sobre a coleção via `ai-service` opcional;
- ranking determinístico de trocas, com repetidas para oferecer e faltantes para buscar;
- recomendação de próxima melhor ação para comprar, trocar, comprar e trocar, esperar ou buscar alvos específicos;
- previsão local de conclusão, com data estimada, faixa provável e nível de confiança;
- busca web opcional, backend-only, para atualizações recentes da Copa 2026;
- métricas do histórico da coleção usadas pela previsão;
- marcos históricos, como compras antigas ou cargas iniciais, registrados sem alterar o inventário atual.

A previsão, a estratégia de trocas e a próxima melhor ação rodam localmente no navegador. O chat envia um snapshot temporário da coleção para `http://127.0.0.1:8000` somente quando você faz uma pergunta no AIvan. O provider padrão é o Ollama local; OpenAI é opcional e deve ser configurado apenas em `ai-service/.env`. A busca web vem desligada por padrão e só pode ser habilitada no backend.

Para rodar o serviço de chat:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Explicabilidade De IA

O AIvan separa apoio determinístico à decisão de geração de linguagem com GenAI.

- `src/domain/forecast.ts` é o baseline estatístico: usa eventos de aquisição e saturação atual para estimar data de conclusão, faixa provável e confiança.
- `src/domain/tradeStrategy.ts` ranqueia candidatos de troca com fatores explícitos, como especiais, fotos do time, liquidez das repetidas, pressão para fechar seções e progresso atual do álbum.
- `src/domain/nextBestAction.ts` combina estatísticas, ranking de trocas, estágio do álbum, moeda de troca por repetidas e volume de eventos em uma recomendação acionável com motivos, riscos, confiança, pacotes sugeridos, faltantes-alvo e repetidas para oferecer.
- `src/ai/albumSnapshot.ts` envia forecast, estratégia de troca e próxima melhor ação já calculados ao backend opcional para que o LLM explique números conhecidos, sem recalcular nem inventar.

Os limites do modelo são intencionais e visíveis. Isto não é modelo supervisionado treinado, OCR, oráculo de preço ou serviço externo de predição. Valor de troca é uma heurística baseada no volume de repetidas e estágio do álbum, e a confiança cai quando há pouco histórico. A camada GenAI serve apenas como linguagem natural e tool calling sobre dados determinísticos.

## Relatórios

Na tela **Relatórios**, escolha:

- conteúdo: todas, faltantes, tenho, repetidas e filtro opcional de especiais;
- seção: todas ou uma seleção específica;
- formato: CSV, PDF, PNG, imagem para celular (`IMG/CEL`), folha A4 imprimível (`A4`) ou texto para WhatsApp (`TXT/WPP`).

A prévia e todos os formatos de exportação usam um layout compacto agrupado na ordem do álbum. Cada seção mostra apenas os números das figurinhas do filtro selecionado, e relatórios de repetidas incluem quantidades como `7 (x2)`. O texto para WhatsApp começa com um marcador curto, como `🏆 Copa 2026`, seguido pela categoria selecionada; seleções do mesmo grupo da Copa ficam juntas e linhas em branco aparecem apenas entre blocos do álbum.

As exportações PDF, PNG e A4 usam o mesmo layout de checklist em retrato, com uma linha por seção/seleção do álbum e um quadradinho para cada figurinha selecionada. Nesses checklists, figurinhas `FWC` e número `1` das seleções recebem destaque de brilhante/especial, enquanto as de número `13` recebem destaque de foto/formação do time.

## Privacidade

O rastreador principal não usa login, backend, token ou chave de API. Nenhum dado pessoal é enviado para servidores durante o uso normal.

O chat opcional do AIvan usa um serviço FastAPI local. Com o provider padrão Ollama, o snapshot da coleção permanece na sua máquina. Se o provider opcional OpenAI for habilitado, o snapshot usado na pergunta é enviado para a OpenAI, então chaves de API devem ficar somente em `ai-service/.env` e nunca devem ser commitadas. Se a busca web backend-only for habilitada, a pergunta sobre notícias é enviada ao OpenAI Web Search; o snapshot do álbum não é enviado nessa chamada de busca.

O `.env.example` da raiz expõe apenas `VITE_AI_SERVICE_URL`, que aponta o frontend para o serviço local de IA.

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
- ambientes virtuais Python em `ai-service/`
- backups JSON exportados
- relatórios CSV, PDF, PNG e textos para WhatsApp exportados

## Observações

Este é um projeto pessoal/hobby para controle local de coleção.
