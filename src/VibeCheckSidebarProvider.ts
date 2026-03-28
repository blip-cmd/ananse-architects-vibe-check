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
    }

    private async generateChallenge(apiKeyFromWebview: unknown): Promise<void> {
        const apiKey = typeof apiKeyFromWebview === 'string' ? apiKeyFromWebview.trim() : '';
        if (!apiKey) {
            this.postStatus('Please enter an Anthropic API key to generate a question.', 'error');
            return;
        }

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
                        margin: 12px 0;
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
                        margin-top: 8px;
                    }
                    .btn-danger:hover {
                        background-color: var(--vscode-inputValidation-errorBorder);
                    }
                    .options {
                        margin: 12px 0;
                        display: grid;
                        gap: 8px;
                    }
                    .option {
                        display: flex;
                        gap: 8px;
                        align-items: flex-start;
                        padding: 8px;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
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
                        border-color: var(--vscode-widget-border);
                    }
                    .status.success {
                        border-color: var(--vscode-testing-iconPassed);
                    }
                    .status.error {
                        border-color: var(--vscode-testing-iconFailed);
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>Socratic Lock Active</h2>
                    <input class="input" id="api-key" type="password" placeholder="Enter Anthropic API key" />
                    <button class="btn" id="generate-btn">Generate Challenge</button>

                    <p class="question" id="question-text">Generate a challenge to verify comprehension of the blurred code.</p>
                    <div class="options" id="options"></div>
                    <button class="btn" id="submit-answer" disabled>Submit Answer</button>
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

                    function setStatus(text, kind) {
                        status.textContent = text;
                        status.className = 'status ' + kind;
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
                        submitButton.disabled = true;
                        explanation.textContent = '';
                        vscode.postMessage({
                            type: 'generateChallenge',
                            apiKey: apiKeyInput.value
                        });
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
