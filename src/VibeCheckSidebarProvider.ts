import * as vscode from 'vscode';
import * as https from 'https';
import { clearActiveBlurDecorations, getBlurredTextFromDecorations } from './extension';

type SocraticChallenge = {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
};

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

        this.postStatus('Generating Socratic question from Claude 3.5 Sonnet...', 'info');

        try {
            const systemPrompt = await this.loadSystemPrompt();
            const challenge = await this.requestSocraticChallenge(apiKey, systemPrompt, blurredCode);
            this.currentChallenge = challenge;

            this.view?.webview.postMessage({
                type: 'renderChallenge',
                question: challenge.question,
                options: challenge.options,
            });
            this.postStatus('Question ready. Select one answer to unlock.', 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate question.';
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

    private async loadSystemPrompt(): Promise<string> {
        const promptFileUri = vscode.Uri.joinPath(this._extensionUri, 'master-system-prompt.json');
        const promptFileBytes = await vscode.workspace.fs.readFile(promptFileUri);
        const promptFileText = Buffer.from(promptFileBytes).toString('utf8');
        const parsed = JSON.parse(promptFileText) as { system?: unknown };

        if (typeof parsed.system !== 'string' || parsed.system.trim().length === 0) {
            throw new Error('master-system-prompt.json is missing a valid system prompt.');
        }

        return parsed.system;
    }

    private async requestSocraticChallenge(
        apiKey: string,
        systemPrompt: string,
        codeSnippet: string
    ): Promise<SocraticChallenge> {
        const requestBody = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 600,
            temperature: 0,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: codeSnippet,
                        },
                    ],
                },
            ],
        });

        const rawResponse = await this.postAnthropicRequest(apiKey, requestBody);
        const parsedResponse = JSON.parse(rawResponse) as {
            content?: Array<{ type?: string; text?: string }>;
        };

        const modelText = parsedResponse.content?.find((item) => item.type === 'text')?.text;
        if (!modelText) {
            throw new Error('Claude response did not include text content.');
        }

        return this.parseChallengeFromModelText(modelText);
    }

    private postAnthropicRequest(apiKey: string, requestBody: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const req = https.request(
                'https://api.anthropic.com/v1/messages',
                {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'content-length': Buffer.byteLength(requestBody),
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                },
                (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    res.on('end', () => {
                        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                            reject(new Error(`Anthropic API request failed (${res.statusCode ?? 'unknown'}): ${responseData}`));
                            return;
                        }
                        resolve(responseData);
                    });
                }
            );

            req.on('error', (err) => reject(err));
            req.write(requestBody);
            req.end();
        });
    }

    private parseChallengeFromModelText(modelText: string): SocraticChallenge {
        const jsonMatch = modelText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Claude response did not contain a JSON object.');
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
            question?: unknown;
            options?: unknown;
            correctIndex?: unknown;
            explanation?: unknown;
        };

        if (typeof parsed.question !== 'string' || parsed.question.trim().length === 0) {
            throw new Error('Challenge JSON is missing a valid question.');
        }

        if (!Array.isArray(parsed.options) || parsed.options.length < 2 || !parsed.options.every((option) => typeof option === 'string')) {
            throw new Error('Challenge JSON is missing a valid options array.');
        }

        if (typeof parsed.correctIndex !== 'number' || parsed.correctIndex < 0 || parsed.correctIndex >= parsed.options.length) {
            throw new Error('Challenge JSON has an invalid correctIndex.');
        }

        if (typeof parsed.explanation !== 'string' || parsed.explanation.trim().length === 0) {
            throw new Error('Challenge JSON is missing a valid explanation.');
        }

        return {
            question: parsed.question,
            options: parsed.options,
            correctIndex: parsed.correctIndex,
            explanation: parsed.explanation,
        };
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
                    <p class="hint" id="explanation"></p>
                    <div class="status info" id="status">Waiting for a challenge.</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    const apiKeyInput = document.getElementById('api-key');
                    const generateButton = document.getElementById('generate-btn');
                    const submitButton = document.getElementById('submit-answer');
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
                    });
                </script>
            </body>
            </html>`;
    }
}
