# Como Instalar E Rodar

[English](INSTALL.md)

Este guia e para quem quer baixar o app e usar no proprio computador.

## 1. Instale O Node.js

O app precisa do Node.js para rodar localmente.

1. Acesse: https://nodejs.org/
2. Baixe a versao **LTS**.
3. Instale mantendo as opcoes padrao.
4. Feche e abra novamente o VS Code, PowerShell ou Prompt de Comando.

Para conferir se deu certo, rode:

```bash
node --version
npm --version
```

Se os dois comandos mostrarem numeros de versao, esta tudo certo.

## 2. Baixe O Projeto

No GitHub, voce pode baixar de duas formas.

Opcao A: baixar ZIP

1. Clique em **Code**.
2. Clique em **Download ZIP**.
3. Extraia o arquivo em uma pasta do computador.

Opcao B: clonar com Git

```bash
git clone URL_DO_REPOSITORIO
```

Depois entre na pasta:

```bash
cd NOME_DA_PASTA
```

## 3. Instale As Dependencias

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
http://localhost:5173/
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

- fechar o navegador nao apaga os dados;
- desligar o computador nao apaga os dados;
- limpar dados do site/navegador pode apagar os dados;
- usar outro navegador pode mostrar um album vazio.

Para maior seguranca, use a tela **Backup** e clique em **Exportar backup JSON**.

Evite subir esse arquivo de backup para repositorios publicos, porque ele contem o progresso da sua colecao.

## Recuperar Um Backup

1. Abra a tela **Backup**.
2. Escolha **Substituir** ou **Mesclar**.
3. Clique em **Recuperar dados**.
4. Selecione o arquivo `.json` exportado anteriormente.

## Problemas Comuns

### O comando `npm` nao funciona

Feche e abra novamente o terminal. Se continuar, reinstale o Node.js LTS marcando a opcao para adicionar ao PATH.

### A pagina nao abre

Confira se o terminal ainda esta rodando `npm run dev`.

### Meus dados sumiram

Verifique se voce esta usando o mesmo navegador e a mesma URL:

```txt
http://localhost:5173/
```

Se tiver um backup JSON, restaure pela tela **Backup**.
