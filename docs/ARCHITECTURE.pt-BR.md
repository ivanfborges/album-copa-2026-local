# Arquitetura

[English](ARCHITECTURE.md)

Este projeto é um aplicativo web local para controle de figurinhas do álbum Panini da Copa 2026. O app principal roda no navegador, não precisa de backend e armazena os dados do usuário localmente. O chat do AIvan é um microserviço local opcional.

## Tecnologias

- React: interface e estado da aplicação.
- TypeScript: tipagem do domínio, catálogo e exportações.
- Vite: servidor local de desenvolvimento e build.
- Dexie/IndexedDB: banco local do navegador para progresso do álbum.
- jsPDF: geração de relatórios PDF sob demanda.
- Canvas API: geração de relatórios PNG.
- flag-icons: ícones SVG de bandeiras com renderização consistente entre plataformas.
- CSS nativo: layout, tema claro/escuro e responsividade.
- Vitest: testes unitários de regras de negócio, relatórios/exportações e renderização básica das telas.
- Serviço opcional de IA: Python/FastAPI com provider local Ollama, OpenAI como provider explícito e opt-in, e fluxo de agente preparado para LangGraph.

## Visão Geral

```txt
src/
  ai/           builder de snapshot para o ai-service e cliente HTTP
  backup/       validação, importação e exportação de backup JSON
  components/   componentes reutilizáveis de interface
  pages/        telas principais do app
  data/         catálogo do álbum, grupos, bandeiras e metadados
  db/           Dexie, IndexedDB, operações de persistência e histórico de eventos
  domain/       regras de negócio para estatísticas, entrada rápida, previsão, estratégia de trocas e próxima melhor ação
  reports/      montagem de dados e exportadores CSV/PDF/PNG/mobile/WhatsApp
  App.tsx       composição das telas e fluxos principais

ai-service/
  app/          FastAPI, providers, tools determinísticas e orquestração do agente
  .env.example  exemplo de configuração local de providers
```

O catálogo de figurinhas fica versionado em `src/data/catalog.ts`. O progresso do usuário não fica nesse arquivo: ele é salvo no IndexedDB do navegador.

Para manter o carregamento inicial do dashboard leve, telas secundárias são carregadas sob demanda e os exportadores de relatório só são importados quando o usuário inicia uma exportação.

## Dados

O catálogo usa os principais modelos:

- `Sticker`: identificador, código visível, seção/seleção, número, nome, tipo, especial e ordem.
- `StickerSection`: seção do álbum, como `PANINI`, `FWC`, `BRA`, `ARG`.
- `InventoryItem`: quantidade local do usuário para cada figurinha.
- `CollectionEvent`: histórico local de mudanças relevantes na coleção, usado como base de dados para funcionalidades orientadas a IA.

Códigos são normalizados sem espaço, por exemplo:

- `BRA 1` vira `BRA1`
- `FWC 3` vira `FWC3`

## Persistência

A aplicação usa IndexedDB via Dexie. O banco local se chama `album-copa-2026` e possui três tabelas:

- `inventory`: quantidades das figurinhas.
- `collectionEvents`: log local de eventos para alterações manuais, entrada rápida, pacotinho, limpeza de repetidas, restauração de backup e marcos históricos.
- `meta`: preferências e datas, como apelido do álbum e último salvamento.

Cada clique em `+`, `-`, entrada rápida, remoção rápida, pacotinho ou limpeza em massa de repetidas salva automaticamente no navegador e registra um evento local. A entrada rápida e o pacotinho também calculam, antes de salvar, quantos códigos válidos são novos para o álbum e quantos viram repetidas. Códigos repetidos são destacados diretamente no campo de entrada sem adicionar dependência de editor rich text.

Marcos históricos podem ser registrados pela tela AIvan. Esses registros não alteram o inventário atual; eles servem para preservar eventos agregados antigos, como cargas iniciais grandes ou compras antigas de pacotinhos, para a previsão local de conclusão.

## Chat AIvan

O chat do AIvan é isolado do frontend principal. O navegador primeiro calcula os resultados determinísticos de decisão de IA em `src/domain`, depois monta um `AlbumSnapshot` temporário em `src/ai/albumSnapshot.ts` e envia esse pacote ao serviço FastAPI local somente quando o usuário faz uma pergunta.

```txt
React / IndexedDB
  -> motores determinísticos de domínio
      -> builder de snapshot do AIvan
      -> http://127.0.0.1:8000/chat
          -> tools determinísticas do álbum
          -> provider: Ollama por padrão, OpenAI somente se configurado
```

O serviço expõe tools como:

- `get_album_summary`
- `get_missing_stickers`
- `get_duplicates`
- `get_trade_suggestions`
- `get_trade_strategy`
- `rank_trade_candidates`
- `get_next_best_action`
- `search_world_cup_news`
- `generate_whatsapp_trade_message`
- `explain_forecast`
- `generate_whatsapp_text`
- `forecast_completion`

O LLM recebe os resultados das tools como contexto e é instruído a não inventar dados, quantidades, códigos, datas, níveis de confiança ou notícias da coleção. Se o Ollama não estiver rodando, o serviço faz fallback para uma resposta determinística resumindo os resultados das tools.

## Camada De Decisão De IA

A tela AIvan inclui uma camada determinística local de apoio à decisão. O navegador calcula esses resultados antes de qualquer chamada ao LLM, e os mesmos dados aparecem nos cards do AIvan e entram no snapshot do chat.

- `src/domain/forecast.ts`: baseline estatístico para data de conclusão, faixa provável de dias e confiança.
- `src/domain/tradeStrategy.ts`: ranking explicável de repetidas para oferecer e faltantes para buscar.
- `src/domain/nextBestAction.ts`: recomendação final construída a partir de estatísticas, ranking de trocas, estágio do álbum, moeda de troca e volume de eventos.
- `src/ai/albumSnapshot.ts`: contrato do snapshot com `forecast`, `trade_strategy` e `next_best_action` para as tools do backend.

O baseline de previsão usa apenas eventos de aquisição: marcos históricos, adições em massa pela entrada rápida, lançamentos de pacotinhos e alterações manuais positivas de quantidade. Ele ignora restaurações de backup, limpeza de repetidas e eventos de remoção para que manutenção operacional não distorça o ritmo da coleção.

A estratégia de trocas usa fatores explícitos: especiais/FWC, escudos de seleção, fotos do time, liquidez das repetidas, pressão para fechar seções e estágio atual do álbum. Cada item ranqueado leva motivos curtos e prioridade.

O motor de próxima melhor ação transforma esses sinais em uma recomendação `buy_packs`, `trade_first`, `buy_and_trade`, `wait` ou `manual_targets`. A resposta inclui recomendação, confiança, motivos, riscos, quantidade sugerida de pacotes, faltantes-alvo e repetidas para oferecer.

## Avaliação E Limites

A camada de decisão de IA é intencionalmente pequena, testável e explicável. Os módulos de domínio em TypeScript têm testes unitários para forecast, estratégia de trocas, próxima melhor ação, snapshots, backups e renderização básica de telas. O `ai-service` em Python tem cobertura com `unittest` para tools determinísticas e roteamento.

Limites atuais do modelo:

- Não é um modelo supervisionado treinado e não aprende entre usuários.
- Não implementa OCR, reconhecimento por foto, consulta de preços ou dados de mercado.
- A busca web é backend-only, vem desligada por padrão e usa OpenAI Web Search somente quando habilitada explicitamente em `ai-service/.env`.
- A próxima melhor ação é uma heurística determinística, não um otimizador treinado ou modelo de marketplace.
- Oportunidade de troca é derivada do volume de repetidas e lacunas prioritárias, não um sinal de marketplace social.
- A confiança cai de propósito quando há pouco histórico de eventos.
- Providers GenAI podem explicar resultados das tools e gerar textos, mas o código determinístico TypeScript/Python continua sendo a fonte da verdade para números.

## Backup

O backup JSON é o formato portátil dos dados do usuário. Ele inclui:

- identificador do app;
- versão do backup;
- id do álbum;
- data de exportação;
- preferências;
- inventário;
- histórico de eventos da coleção, quando disponível.

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

- CSV: planilha compacta agrupada por seção do álbum.
- PDF: checklist em retrato para impressão ou conferência rápida, com uma linha por seção/seleção e um quadradinho marcável por figurinha selecionada.
- Checklist A4: PDF em retrato para impressão, usando o mesmo layout compacto da exportação PDF padrão.
- PNG: imagem em retrato usando o mesmo layout visual compacto das exportações PDF/A4.
- PNG celular (`IMG/CEL`): imagem vertical e compacta otimizada para consulta no celular durante trocas.
- Texto WhatsApp (`TXT/WPP`): texto compacto agrupado na ordem do álbum para compartilhar faltantes ou repetidas em conversas. Ele começa com um título com troféu e um marcador de categoria, mantém seleções do mesmo grupo da Copa juntas e insere linhas em branco apenas entre blocos do álbum.

A prévia da tela de relatórios usa a mesma estrutura agrupada das exportações, mantendo a conferência visual próxima do arquivo que será compartilhado.

Nas exportações de checklist para impressão, figurinhas `FWC` e número `1` das seleções recebem destaque de brilhante/especial, enquanto as de número `13` recebem destaque de foto/formação do time. Esses marcadores são sutis para manter a folha limpa para impressão e conferência manual.

## Privacidade E Segurança

O app principal não precisa de login, token, chave de API ou `.env` para funcionar. Os dados do usuário ficam no navegador local e só saem do computador quando o próprio usuário exporta um arquivo.

O chat opcional do AIvan usa um serviço local separado. Com Ollama, o snapshot permanece na mesma máquina. Se o provider opcional OpenAI for habilitado, o snapshot da pergunta atual é enviado para a OpenAI naquela requisição, então `OPENAI_API_KEY` deve ficar apenas em `ai-service/.env`. Se a busca web backend-only for habilitada, apenas a pergunta sobre notícias é enviada ao OpenAI Web Search; o snapshot do álbum não é enviado nessa chamada.

O projeto não inclui mascotes oficiais ou logos oficiais proprietários. A identidade visual incluída no repositório é própria do app; bandeiras são renderizadas por ícones SVG open-source.

Imagens locais opcionais em `public/brand/` podem customizar a interface durante o uso pessoal. Esses arquivos são ignorados pelo Git por padrão.

Arquivos ignorados pelo Git:

- `node_modules/`
- `dist/`
- logs (`*.log`)
- arquivos `.env`
- caches locais
- ambientes virtuais e caches Python em `ai-service/`
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
