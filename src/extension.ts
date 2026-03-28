import * as vscode from 'vscode';
import { VibeCheckSidebarProvider } from './VibeCheckSidebarProvider';

// Module-level variable to store our active blur decorations.
// This allows the sidebar to clear them later.
export let activeBlurDecorations: { editor: vscode.TextEditor; ranges: vscode.Range[] }[] = [];

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
    context.subscriptions.push(changeListener);
}

export function deactivate() {}
