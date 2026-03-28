import * as vscode from 'vscode';
import { VibeCheckSidebarProvider } from './VibeCheckSidebarProvider';

// Module-level variable to store our active blur decorations.
// This allows the sidebar to clear them later.
export let activeBlurDecorations: { editor: vscode.TextEditor; ranges: vscode.Range[] }[] = [];

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

    context.subscriptions.push(analyzeCommand);
}

export function deactivate() {}
