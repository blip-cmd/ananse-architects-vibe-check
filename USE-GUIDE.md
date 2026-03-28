# Vibe Check Extension Use Guide

## 1. Install dependencies

```bash
npm install
```

## 2. Build the extension

```bash
npm run compile
```

## 3. Run in Extension Development Host

1. Open this project in VS Code.
2. Press `F5`.
3. A new Extension Development Host window opens.

## 4. Use the feature

1. In the host window, open any code file.
2. Select a block of code.
3. Run command: `Vibe Check: Analyze Block`.
4. Open the `Vibe Check` sidebar.
5. Click `Unlock Code` to remove blur decoration.

## 5. Useful dev commands

```bash
npm run watch
```

```bash
npm run lint
```

## 6. Package extension (optional)

If you later install `vsce`, package with:

```bash
npx @vscode/vsce package
```
