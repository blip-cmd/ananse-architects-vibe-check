import * as vscode from 'vscode';
import { activeBlurDecorations, blurDecorationType } from './extension';

export class VibeCheckSidebarProvider implements vscode.WebviewViewProvider {
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage((data) => {
            switch (data.type) {
                case 'unlock': {
                    // Clear all applied blur decorations
                    for (const { editor } of activeBlurDecorations) {
                        try {
                            editor.setDecorations(blurDecorationType, []);
                        } catch (e) {
                            console.error('Failed to clear decorations for an editor', e);
                        }
                    }
                    // Empty the tracking array
                    activeBlurDecorations.length = 0;
                    vscode.window.showInformationMessage('Code Unlocked! Keep engineering.');
                    break;
                }
            }
        });
    }

    private getHtmlForWebview(): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vibe Check</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 16px;
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .card {
                        background: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 16px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    h2 {
                        margin-top: 0;
                        font-size: 1.2em;
                        color: var(--vscode-editorError-foreground);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .question {
                        font-size: 1em;
                        line-height: 1.4;
                        margin-bottom: 16px;
                    }
                    .btn-unlock {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1em;
                        width: 100%;
                        transition: background-color 0.2s;
                    }
                    .btn-unlock:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .hint {
                        font-size: 0.85em;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 12px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🛡️ Socratic Lock Active</h2>
                    <p class="question">
                        You've just pasted or generated a block of code. Before it becomes technical debt, prove you understand it.
                        <br><br>
                        <em>(In the full version, Claude 3.5 Sonnet will generate a multiple-choice question here based on the blurred code).</em>
                    </p>
                    <button class="btn-unlock" id="unlock-btn">Unlock Code</button>
                    <p class="hint">Bypassing without answering adds to VIBE_DEBT.md</p>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('unlock-btn').addEventListener('click', () => {
                        vscode.postMessage({ type: 'unlock' });
                    });
                </script>
            </body>
            </html>`;
    }
}
