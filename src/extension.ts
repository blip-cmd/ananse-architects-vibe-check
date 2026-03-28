import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { VibeCheckSidebarProvider } from './VibeCheckSidebarProvider';

const workspaceRootForEnv = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
type DotenvLike = {
    config: (options?: { path?: string }) => void;
};

let dotenvModule: DotenvLike | undefined;
try {
    // Load dotenv if available so workspace-root .env values become process.env entries.
    dotenvModule = require('dotenv') as DotenvLike;
} catch {
    dotenvModule = undefined;
}

dotenvModule?.config(
    workspaceRootForEnv
        ? { path: path.join(workspaceRootForEnv, '.env') }
        : undefined
);

// Module-level variable to store our active blur decorations.
// This allows the sidebar to clear them later.
export let activeBlurDecorations: { editor: vscode.TextEditor; ranges: vscode.Range[] }[] = [];
let extensionRootPath: string | undefined;

export type SocraticChallenge = {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
};

export function getBlurredTextFromDecorations(): string | undefined {
    if (activeBlurDecorations.length === 0) {
        return undefined;
    }

    // Prefer the most recently blurred block to match current user workflow.
    const latest = activeBlurDecorations[activeBlurDecorations.length - 1];
    const snippets = latest.ranges
        .map((range) => latest.editor.document.getText(range))
        .filter((snippet) => snippet.trim().length > 0);

    if (snippets.length === 0) {
        return undefined;
    }

    return snippets.join('\n');
}

export function clearActiveBlurDecorations(): void {
    for (const { editor } of activeBlurDecorations) {
        try {
            editor.setDecorations(blurDecorationType, []);
        } catch (e) {
            console.error('Failed to clear decorations for an editor', e);
        }
    }
    activeBlurDecorations.length = 0;
}

function clearBlurDecorationForActiveEditor(editor: vscode.TextEditor): void {
    editor.setDecorations(blurDecorationType, []);
    activeBlurDecorations = activeBlurDecorations.filter(
        (entry) => entry.editor.document.uri.toString() !== editor.document.uri.toString()
    );
}

function appendEmergencyBypassDebtLog(editor: vscode.TextEditor): void {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        return;
    }

    const debtLogPath = path.join(workspaceRoot, 'VIBE_DEBT.md');
    const timestamp = new Date().toISOString();
    const activeFileName = path.basename(editor.document.fileName);
    const header = '| Timestamp | Active File | Reason |\n| --- | --- | --- |\n';
    const row = `| ${timestamp} | ${activeFileName} | Emergency Bypass |\n`;

    if (!fs.existsSync(debtLogPath)) {
        fs.writeFileSync(debtLogPath, header + row, 'utf8');
        return;
    }

    fs.appendFileSync(debtLogPath, row, 'utf8');
}

function loadMasterSystemPrompt(): string {
    if (!extensionRootPath) {
        throw new Error('Extension root path is not initialized.');
    }

    const promptFilePath = path.join(extensionRootPath, 'master-system-prompt.json');
    const promptFileText = fs.readFileSync(promptFilePath, 'utf8');
    const parsed = JSON.parse(promptFileText) as { system?: unknown };

    if (typeof parsed.system !== 'string' || parsed.system.trim().length === 0) {
        throw new Error('master-system-prompt.json is missing a valid system prompt.');
    }

    return parsed.system;
}

function parseSocraticChallengeFromText(modelText: string): SocraticChallenge {
    const jsonMatch = modelText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Model response did not contain a JSON object.');
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

    if (!Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.options.every((option) => typeof option === 'string')) {
        throw new Error('Challenge JSON must include an options array of exactly 4 strings.');
    }

    if (typeof parsed.correctIndex !== 'number' || !Number.isInteger(parsed.correctIndex) || parsed.correctIndex < 0 || parsed.correctIndex >= parsed.options.length) {
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

function postJsonWithTimeout(url: string, headers: Record<string, string | number>, body: string, timeoutMs = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.request(
            url,
            {
                method: 'POST',
                headers,
            },
            (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`API request failed (${res.statusCode ?? 'unknown'}): ${responseData}`));
                        return;
                    }
                    resolve(responseData);
                });
            }
        );

        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });

        req.on('error', (err) => reject(err));
        req.write(body);
        req.end();
    });
}

async function callClaudePrimary(codeSnippet: string, userProvidedClaudeKey: string): Promise<SocraticChallenge> {
    const key = userProvidedClaudeKey.trim();
    if (!key) {
        throw new Error('Claude API key not provided.');
    }

    const requestBody = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        temperature: 0,
        system: loadMasterSystemPrompt(),
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

    const rawResponse = await postJsonWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(requestBody),
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
        },
        requestBody
    );

    const parsedResponse = JSON.parse(rawResponse) as {
        content?: Array<{ type?: string; text?: string }>;
    };

    const modelText = parsedResponse.content?.find((item) => item.type === 'text')?.text;
    if (!modelText) {
        throw new Error('Claude response did not include text content.');
    }

    return parseSocraticChallengeFromText(modelText);
}

export async function callGeminiFallback(codeSnippet: string): Promise<SocraticChallenge> {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured in .env at workspace root.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const requestBody = JSON.stringify({
        system_instruction: {
            parts: [{ text: loadMasterSystemPrompt() }],
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: codeSnippet }],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), 15000);

    let rawResponse: string;
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody,
            signal: controller.signal,
        });

        rawResponse = await response.text();

        if (!response.ok) {
            throw new Error(`Gemini API request failed (${response.status}): ${rawResponse}`);
        }
    } finally {
        clearTimeout(timeoutHandle);
    }

    const parsedResponse = JSON.parse(rawResponse) as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };

    const modelText = parsedResponse.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
    if (!modelText) {
        throw new Error('Gemini response did not include text content.');
    }

    return parseSocraticChallengeFromText(modelText);
}

export async function generateSocraticChallenge(codeSnippet: string, userProvidedClaudeKey: string): Promise<SocraticChallenge> {
    try {
        const challenge = await callClaudePrimary(codeSnippet, userProvidedClaudeKey);
        console.info('Vibe-Check API used: Claude');
        return challenge;
    } catch (claudeError) {
        console.warn('Claude primary call failed, switching to Gemini fallback.', claudeError);
        try {
            const challenge = await callGeminiFallback(codeSnippet);
            console.info('Vibe-Check API used: Gemini fallback');
            return challenge;
        } catch (geminiError) {
            console.error('Gemini fallback also failed.', geminiError);
            throw new Error('Failed to generate Socratic challenge from both Claude and Gemini.');
        }
    }
}

// Create the blur decoration type.
// VS Code's decoration API does not strictly support arbitrary CSS that changes layout,
// but we can use opacity and letter-spacing to visually approximate blurred/unreadable text,
// along with the filter property in textDecoration.
export const blurDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'none; filter: blur(5px);',
    opacity: '0.15',
    letterSpacing: '-1em',
    cursor: 'not-allowed',
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Slight red tint to indicate it's locked
    isWholeLine: false,
});

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vibe-check-extenstion" is now active!');
    extensionRootPath = context.extensionUri.fsPath;

    const redisImportTrigger = 'import redis';

    // Register the Vibe Check Sidebar Webview
    const sidebarProvider = new VibeCheckSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "vibecheck.sidebarView",
            sidebarProvider
        )
    );

    // Register the analyzeBlock command
    let analyzeCommand = vscode.commands.registerCommand('vibecheck.analyzeBlock', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found to analyze.');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select a block of code to Vibe Check.');
            return;
        }

        // Apply the blur decoration to the selected text
        const ranges = [selection];
        editor.setDecorations(blurDecorationType, ranges);

        // Store the decoration state so it can be cleared later
        activeBlurDecorations.push({ editor, ranges });

        vscode.window.showInformationMessage('Vibe Check applied! Answer the Socratic question in the sidebar to unlock.');
        
        // Focus the sidebar
        vscode.commands.executeCommand('vibecheck.sidebarView.focus');
    });

    const emergencyBypassCommand = vscode.commands.registerCommand('vibecheck.emergencyBypass', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found for Emergency Bypass.');
            return;
        }

        clearBlurDecorationForActiveEditor(editor);
        appendEmergencyBypassDebtLog(editor);
        vscode.window.showWarningMessage('Emergency Bypass used. Blur removed and VIBE_DEBT.md updated.');
    });

    const changeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.contentChanges.length === 0) {
            return;
        }

        for (const change of event.contentChanges) {
            if (!change.text.includes(redisImportTrigger)) {
                continue;
            }

            const { document } = event;
            const start = change.range.start;
            const startOffset = document.offsetAt(start);
            const end = document.positionAt(startOffset + change.text.length);
            const detectedRange = new vscode.Range(start, end);

            let editor = vscode.window.visibleTextEditors.find(
                visibleEditor => visibleEditor.document.uri.toString() === document.uri.toString()
            );

            if (!editor) {
                editor = await vscode.window.showTextDocument(document, {
                    preview: false,
                    preserveFocus: false,
                });
            }

            editor.selection = new vscode.Selection(detectedRange.start, detectedRange.end);
            editor.revealRange(detectedRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

            await vscode.commands.executeCommand('vibecheck.analyzeBlock');
            break;
        }
    });

    context.subscriptions.push(analyzeCommand);
    context.subscriptions.push(emergencyBypassCommand);
    context.subscriptions.push(changeListener);
}

export function deactivate() {}
