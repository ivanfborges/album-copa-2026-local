# Como Instalar E Rodar

[English](INSTALL.md)

Este guia é para quem quer baixar o app e usar no próprio computador.

## 1. Instale O Node.js

O app precisa do Node.js para rodar localmente.

1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS**.
3. Instale mantendo as opções padrão.
4. Feche e abra novamente o VS Code, PowerShell ou Prompt de Comando.

Para conferir se deu certo, rode:

```bash
node --version
npm --version
```

Se os dois comandos mostrarem números de versão, está tudo certo.

## 2. Baixe O Projeto

No GitHub, você pode baixar de duas formas.

Opção A: baixar ZIP

1. Clique em **Code**.
2. Clique em **Download ZIP**.
3. Extraia o arquivo em uma pasta do computador.

Opção B: clonar com Git

```bash
git clone URL_DO_REPOSITORIO
```

Depois entre na pasta:

```bash
cd NOME_DA_PASTA
```

## 3. Instale As Dependências

Dentro da pasta do projeto, rode:

```bash
npm install
```

Esse comando baixa as bibliotecas usadas pelo app.

## 4. Rode O App

Ainda dentro da pasta do projeto, rode:

```bash
npm run dev
```

O terminal vai mostrar uma URL parecida com:

```txt
http://127.0.0.1:3001/
```

Abra essa URL no navegador.

## 5. Como Fechar

Para parar o app, volte no terminal e pressione:

```txt
Ctrl + C
```

Quando quiser usar de novo, entre na pasta do projeto e rode:

```bash
npm run dev
```

## Onde Meus Dados Ficam Salvos?

Os dados ficam salvos no navegador, usando IndexedDB.

Isso significa que:

- fechar o navegador não apaga os dados;
- desligar o computador não apaga os dados;
- limpar dados do site/navegador pode apagar os dados;
- usar outro navegador pode mostrar um álbum vazio.

Para maior segurança, use a tela **Backup** e clique em **Exportar backup JSON**.

Evite subir esse arquivo de backup para repositórios públicos, porque ele contém o progresso da sua coleção.

## Recuperar Um Backup

1. Abra a tela **Backup**.
2. Escolha **Substituir** ou **Mesclar**.
3. Clique em **Recuperar dados**.
4. Selecione o arquivo `.json` exportado anteriormente.

## Registrar Marcos Históricos

A tela **AIvan** tem a área **Marcos para IA**. Use somente se quiser registrar lotes antigos de forma agregada, como uma primeira entrega grande de figurinhas ou compras antigas de pacotinhos. Esses marcos não alteram o álbum atual; eles melhoram a previsão local de conclusão exibida no AIvan.

## Opcional: Rodar O Chat Do AIvan

O rastreador do álbum funciona sem o serviço de IA. Use esta parte apenas se quiser usar o chat local dentro do **AIvan**.

1. Instale o Ollama: https://ollama.com/
2. Baixe um modelo local:

```bash
ollama pull qwen3:4b
```

3. Em um segundo terminal, inicie o serviço de IA:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Mantenha os dois terminais abertos:

- frontend: `npm run dev`
- serviço de IA: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

Por padrão, o chat envia um snapshot temporário do álbum somente para o serviço local em `127.0.0.1:8000`.

## Problemas Comuns

### O comando `npm` não funciona

Feche e abra novamente o terminal. Se continuar, reinstale o Node.js LTS marcando a opção para adicionar ao PATH.

No Windows PowerShell, se aparecer um erro de política de execução para `npm.ps1`, rode os comandos com `npm.cmd`:

```bash
npm.cmd install
npm.cmd run dev
```

### A página não abre

Confira se o terminal ainda está rodando `npm run dev`.

Se o Windows mostrar erro de permissão em outra porta local, mantenha o comando padrão do projeto e abra:

```txt
http://127.0.0.1:3001/
```

### Meus dados sumiram

Verifique se você está usando o mesmo navegador e a mesma URL:

```txt
http://127.0.0.1:3001/
```

Se tiver um backup JSON, restaure pela tela **Backup**.

### O chat do AIvan não responde

Confira se o Ollama está rodando, se o modelo foi baixado e se o terminal do serviço de IA continua aberto em:

```txt
http://127.0.0.1:8000/health
```
