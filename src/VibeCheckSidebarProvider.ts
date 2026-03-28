import * as vscode from 'vscode';
import {
    clearActiveBlurDecorations,
    generateSocraticChallenge,
    getBlurredTextFromDecorations,
    SocraticChallenge,
} from './extension';

export class VibeCheckSidebarProvider implements vscode.WebviewViewProvider {
    private view: vscode.WebviewView | undefined;
    private currentChallenge: SocraticChallenge | undefined;
    private pendingAutoGenerate = false;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'generateChallenge': {
                    await this.generateChallenge(data.apiKey);
                    break;
                }
                case 'submitAnswer': {
                    this.handleAnswerSubmission(Number(data.selectedIndex));
                    break;
                }
                case 'emergencyBypass': {
                    await vscode.commands.executeCommand('vibecheck.emergencyBypass');
                    this.currentChallenge = undefined;
                    this.view?.webview.postMessage({ type: 'challengeReset' });
                    this.postStatus('Emergency Bypass applied. Blur removed instantly.', 'error');
                    break;
                }
            }
        });

        if (this.pendingAutoGenerate) {
            this.pendingAutoGenerate = false;
            this.view.webview.postMessage({ type: 'autoGenerateChallenge' });
        }
    }

    public notifyBlurApplied(): void {
        if (!this.view) {
            this.pendingAutoGenerate = true;
            return;
        }

        this.view.webview.postMessage({ type: 'autoGenerateChallenge' });
    }

    private async generateChallenge(apiKeyFromWebview: unknown): Promise<void> {
        const apiKey = typeof apiKeyFromWebview === 'string' ? apiKeyFromWebview.trim() : '';

        const blurredCode = getBlurredTextFromDecorations();
        if (!blurredCode) {
            this.postStatus('No blurred code block found. Trigger Vibe Check first.', 'error');
            return;
        }

        console.log('[VIBE-CHECK DEBUG] Blurred code extracted:', blurredCode.substring(0, 50) + '...');
        console.log('[VIBE-CHECK DEBUG] Calling generateSocraticChallenge...');
        this.postStatus('Generating Socratic question from Claude 3.5 Sonnet...', 'info');

        try {
            const challenge = await generateSocraticChallenge(blurredCode, apiKey);
            console.log('[VIBE-CHECK DEBUG] Challenge received:', challenge);
            this.currentChallenge = challenge;

            console.log('[VIBE-CHECK DEBUG] Posting renderChallenge message:', {
                type: 'renderChallenge',
                question: challenge.question,
                options: challenge.options,
            });

            this.view?.webview.postMessage({
                type: 'renderChallenge',
                question: challenge.question,
                options: challenge.options,
            });
            this.postStatus('Question ready. Select one answer to unlock.', 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate question.';
            console.error('[VIBE-CHECK DEBUG] Challenge generation failed:', error);
            this.postStatus(message, 'error');
            this.view?.webview.postMessage({
                type: 'challengeGenerationError',
                message,
            });
        }
    }

    private handleAnswerSubmission(selectedIndex: number): void {
        if (!this.currentChallenge) {
            this.postStatus('No active question. Generate one first.', 'error');
            return;
        }

        if (!Number.isInteger(selectedIndex)) {
            this.postStatus('Please select an answer option.', 'error');
            return;
        }

        if (selectedIndex === this.currentChallenge.correctIndex) {
            clearActiveBlurDecorations();
            this.view?.webview.postMessage({
                type: 'unlockSuccess',
                explanation: this.currentChallenge.explanation,
            });
            vscode.window.showInformationMessage('Code Unlocked! Keep engineering.');
            this.currentChallenge = undefined;
            this.postStatus('Correct answer. Blur lock removed.', 'success');
            return;
        }

        this.view?.webview.postMessage({
            type: 'unlockFailure',
            explanation: this.currentChallenge.explanation,
        });
        this.postStatus('Incorrect answer. Review and try again.', 'error');
    }

    private postStatus(text: string, kind: 'info' | 'success' | 'error'): void {
        this.view?.webview.postMessage({
            type: 'status',
            text,
            kind,
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
                    :root {
                        --card-bg-start: color-mix(in srgb, var(--vscode-editorWidget-background) 90%, #122233 10%);
                        --card-bg-end: color-mix(in srgb, var(--vscode-editorWidget-background) 84%, #3b1e12 16%);
                        --soft-border: color-mix(in srgb, var(--vscode-widget-border) 70%, #f29b63 30%);
                        --muted: var(--vscode-descriptionForeground);
                        --ok: var(--vscode-testing-iconPassed);
                        --fail: var(--vscode-testing-iconFailed);
                    }
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 14px;
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                    }
                    .card {
                        position: relative;
                        overflow: hidden;
                        background: linear-gradient(155deg, var(--card-bg-start), var(--card-bg-end));
                        border: 1px solid var(--soft-border);
                        border-radius: 10px;
                        padding: 16px;
                        margin-bottom: 12px;
                        box-shadow: 0 8px 26px rgba(0, 0, 0, 0.24);
                    }
                    .card::before {
                        content: '';
                        position: absolute;
                        width: 180px;
                        height: 180px;
                        right: -70px;
                        top: -90px;
                        border-radius: 999px;
                        background: radial-gradient(circle, rgba(242, 155, 99, 0.22), transparent 65%);
                        pointer-events: none;
                    }
                    h2 {
                        margin-top: 0;
                        margin-bottom: 8px;
                        font-size: 1.06em;
                        letter-spacing: 0.02em;
                        color: var(--vscode-editor-foreground);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .subtitle {
                        margin: 0 0 12px;
                        color: var(--muted);
                        font-size: 0.85em;
                        line-height: 1.35;
                    }
                    .question {
                        font-size: 1em;
                        line-height: 1.5;
                        margin: 10px 0 8px;
                        padding: 10px;
                        border-radius: 8px;
                        border: 1px dashed color-mix(in srgb, var(--soft-border) 80%, transparent 20%);
                        background: color-mix(in srgb, var(--vscode-editor-background) 70%, transparent 30%);
                    }
                    .input {
                        width: 100%;
                        box-sizing: border-box;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                        padding: 8px;
                        margin-bottom: 12px;
                    }
                    .btn {
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
                    .btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .btn-danger {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        color: var(--vscode-inputValidation-errorForeground);
                        margin-top: 10px;
                    }
                    .btn-danger:hover {
                        background-color: var(--vscode-inputValidation-errorBorder);
                    }
                    .btn-secondary {
                        margin-top: 8px;
                    }
                    .options {
                        margin: 12px 0;
                        display: grid;
                        gap: 7px;
                    }
                    .option {
                        display: flex;
                        gap: 8px;
                        align-items: flex-start;
                        padding: 9px;
                        border: 1px solid color-mix(in srgb, var(--vscode-widget-border) 75%, #f29b63 25%);
                        border-radius: 7px;
                        transition: border-color 0.15s ease, background-color 0.15s ease;
                    }
                    .option.selected {
                        border-color: color-mix(in srgb, var(--vscode-focusBorder) 75%, #f29b63 25%);
                        background: color-mix(in srgb, var(--vscode-editor-background) 80%, #f29b63 20%);
                    }
                    .hint {
                        font-size: 0.85em;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 12px;
                    }
                    .status {
                        margin-top: 12px;
                        padding: 8px;
                        border-radius: 4px;
                        border: 1px solid transparent;
                        font-size: 0.9em;
                    }
                    .status.info {
                        border-color: color-mix(in srgb, var(--vscode-widget-border) 78%, #5ba4ff 22%);
                    }
                    .status.success {
                        border-color: var(--ok);
                    }
                    .status.error {
                        border-color: var(--fail);
                    }
                    details.advanced {
                        margin-top: 12px;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 8px;
                        background: color-mix(in srgb, var(--vscode-editor-background) 78%, transparent 22%);
                        overflow: hidden;
                    }
                    details.advanced > summary {
                        list-style: none;
                        cursor: pointer;
                        padding: 8px 10px;
                        font-size: 0.86em;
                        color: var(--muted);
                        user-select: none;
                        border-bottom: 1px solid transparent;
                    }
                    details.advanced[open] > summary {
                        border-bottom-color: var(--vscode-widget-border);
                    }
                    .advanced-content {
                        padding: 10px;
                    }
                    @media (max-width: 420px) {
                        body {
                            padding: 10px;
                        }
                        .card {
                            padding: 12px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>Socratic Lock Active</h2>
                    <p class="subtitle">Blurred code is locked until you choose the right answer. Questions generate automatically right after blur.</p>

                    <p class="question" id="question-text">Waiting for blurred code. Trigger Vibe Check on a selected block.</p>
                    <div class="options" id="options"></div>
                    <button class="btn" id="submit-answer" disabled>Submit Answer</button>

                    <details class="advanced" id="advanced-panel">
                        <summary>Advanced: API key + manual regenerate</summary>
                        <div class="advanced-content">
                            <input class="input" id="api-key" type="password" placeholder="Optional Anthropic API key" />
                            <button class="btn btn-secondary" id="generate-btn">Regenerate Challenge</button>
                        </div>
                    </details>

                    <button class="btn btn-danger" id="emergency-bypass">Emergency Bypass</button>
                    <p class="hint" id="explanation"></p>
                    <div class="status info" id="status">Waiting for a challenge.</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    const apiKeyInput = document.getElementById('api-key');
                    const generateButton = document.getElementById('generate-btn');
                    const submitButton = document.getElementById('submit-answer');
                    const bypassButton = document.getElementById('emergency-bypass');
                    const questionText = document.getElementById('question-text');
                    const optionsContainer = document.getElementById('options');
                    const explanation = document.getElementById('explanation');
                    const status = document.getElementById('status');
                    const advancedPanel = document.getElementById('advanced-panel');

                    const STORAGE_KEY = 'vibecheck.anthropicApiKey';

                    apiKeyInput.value = localStorage.getItem(STORAGE_KEY) || '';
                    apiKeyInput.addEventListener('input', () => {
                        localStorage.setItem(STORAGE_KEY, apiKeyInput.value);
                    });

                    function setStatus(text, kind) {
                        status.textContent = text;
                        status.className = 'status ' + kind;
                    }

                    function requestChallenge() {
                        submitButton.disabled = true;
                        explanation.textContent = '';
                        vscode.postMessage({
                            type: 'generateChallenge',
                            apiKey: apiKeyInput.value
                        });
                    }

                    function renderOptions(options) {
                        optionsContainer.innerHTML = '';

                        options.forEach((optionText, index) => {
                            const label = document.createElement('label');
                            label.className = 'option';

                            const radio = document.createElement('input');
                            radio.type = 'radio';
                            radio.name = 'challengeOption';
                            radio.value = String(index);
                            radio.addEventListener('change', () => {
                                optionsContainer.querySelectorAll('.option').forEach((node) => {
                                    node.classList.remove('selected');
                                });
                                label.classList.add('selected');
                                submitButton.disabled = false;
                            });

                            const textNode = document.createElement('span');
                            textNode.textContent = optionText;

                            label.appendChild(radio);
                            label.appendChild(textNode);
                            optionsContainer.appendChild(label);
                        });
                    }

                    generateButton.addEventListener('click', () => {
                        requestChallenge();
                    });

                    submitButton.addEventListener('click', () => {
                        const selected = document.querySelector('input[name="challengeOption"]:checked');
                        if (!selected) {
                            setStatus('Select an option before submitting.', 'error');
                            return;
                        }

                        vscode.postMessage({
                            type: 'submitAnswer',
                            selectedIndex: Number(selected.value)
                        });
                    });

                    bypassButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'emergencyBypass' });
                    });

                    window.addEventListener('message', (event) => {
                        const data = event.data;

                        if (data.type === 'autoGenerateChallenge') {
                            questionText.textContent = 'Generating a Socratic challenge from your blurred code...';
                            optionsContainer.innerHTML = '';
                            requestChallenge();
                        }

                        if (data.type === 'renderChallenge') {
                            questionText.textContent = data.question;
                            renderOptions(data.options || []);
                            explanation.textContent = '';
                            submitButton.disabled = true;
                        }

                        if (data.type === 'unlockSuccess') {
                            explanation.textContent = data.explanation;
                            setStatus('Correct answer. Code unlocked.', 'success');
                            submitButton.disabled = true;
                            optionsContainer.innerHTML = '';
                        }

                        if (data.type === 'unlockFailure') {
                            explanation.textContent = data.explanation;
                            setStatus('Incorrect answer. Try again.', 'error');
                        }

                        if (data.type === 'status') {
                            setStatus(data.text, data.kind || 'info');
                        }

                        if (data.type === 'challengeGenerationError') {
                            if (advancedPanel && !advancedPanel.open) {
                                advancedPanel.open = true;
                            }
                        }

                        if (data.type === 'challengeReset') {
                            questionText.textContent = 'Challenge bypassed. Generate a new challenge when ready.';
                            optionsContainer.innerHTML = '';
                            explanation.textContent = '';
                            submitButton.disabled = true;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
