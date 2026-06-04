# Install And Run

[pt-BR](INSTALL.pt-BR.md)

This guide is for users who want to download the app and run it on their own computer.

## 1. Install Node.js

The app needs Node.js to run locally.

1. Open: https://nodejs.org/
2. Download the **LTS** version.
3. Install it using the default options.
4. Close and reopen VS Code, PowerShell, Terminal, or Command Prompt.

Check that the installation worked:

```bash
node --version
npm --version
```

If both commands print version numbers, you are good to go.

## 2. Download The Project

On GitHub, you can download the project in two ways.

Option A: download ZIP

1. Click **Code**.
2. Click **Download ZIP**.
3. Extract the file into a folder on your computer.

Option B: clone with Git

```bash
git clone REPOSITORY_URL
```

Then enter the project folder:

```bash
cd FOLDER_NAME
```

## 3. Install Dependencies

Inside the project folder, run:

```bash
npm install
```

This command downloads the libraries used by the app.

## 4. Run The App

Still inside the project folder, run:

```bash
npm run dev
```

The terminal will show a URL similar to:

```txt
http://127.0.0.1:3001/
```

Open that URL in your browser.

## 5. Stop The App

To stop the app, go back to the terminal and press:

```txt
Ctrl + C
```

When you want to use it again, enter the project folder and run:

```bash
npm run dev
```

## Where Is My Data Stored?

Data is saved in the browser through IndexedDB.

That means:

- closing the browser does not erase the data;
- shutting down the computer does not erase the data;
- clearing site/browser data can erase the data;
- using another browser may show an empty album.

For extra safety, use the **Backup** screen and click **Export JSON backup**.

Avoid uploading this backup file to public repositories, because it contains your collection progress.

## Recover A Backup

1. Open the **Backup** screen.
2. Choose **Replace** or **Merge**.
3. Click **Recover data**.
4. Select the previously exported `.json` file.

## Register Historical Milestones

The **AIvan** screen has an **AI milestones** area. Use it only if you want to record old aggregate batches, such as a first large sticker delivery or older pack purchases. These milestones do not change your current album; they improve the local completion forecast shown on AIvan.

## Optional: Run AIvan Chat

The album tracker works without the AI service. Use this section only if you want the local chat inside **AIvan**.

1. Install Ollama: https://ollama.com/
2. Download a local model:

```bash
ollama pull qwen3:4b
```

3. In a second terminal, start the AI service:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Keep both terminals open:

- frontend: `npm run dev`
- AI service: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

The chat sends a temporary album snapshot only to your local `127.0.0.1:8000` service by default.

## Common Issues

### The `npm` command does not work

Close and reopen the terminal. If it still does not work, reinstall Node.js LTS and make sure the option to add it to PATH is enabled.

On Windows PowerShell, if you see a script execution policy error for `npm.ps1`, run the commands with `npm.cmd` instead:

```bash
npm.cmd install
npm.cmd run dev
```

### The page does not open

Check whether the terminal is still running `npm run dev`.

If Windows shows a permission error for another local port, keep the project default command and open:

```txt
http://127.0.0.1:3001/
```

### My data disappeared

Check that you are using the same browser and the same URL:

```txt
http://127.0.0.1:3001/
```

If you have a JSON backup, restore it from the **Backup** screen.

### AIvan chat does not answer

Check that Ollama is running, that the model was downloaded, and that the AI service terminal is still open on:

```txt
http://127.0.0.1:8000/health
```
