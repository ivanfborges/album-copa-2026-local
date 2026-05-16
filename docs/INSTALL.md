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
http://localhost:5173/
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

### My data disappeared

Check that you are using the same browser and the same URL:

```txt
http://localhost:5173/
```

If you have a JSON backup, restore it from the **Backup** screen.
