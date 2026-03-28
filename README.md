# Vibe-Check: The Socratic Middleware

Stop vibing, start engineering.

Vibe-Check is a local-first VS Code extension built to eliminate AI-generated technical debt. It enforces developer comprehension through a "friction layer" in the IDE, ensuring that students and developers maintain ownership and mastery over the code they create.

Built by Ananse Architects for the 2026 Claude Builder Hackathon (Track 3: Economic Empowerment & Education).

## The Problem: "Vibe-Coding"

AI coding assistants optimize for speed. Developers, especially learners, frequently accept large blocks of AI-generated logic (like GitHub Copilot suggestions) simply because it "looks right." We call this "vibe-coding."

While this accelerates short-term output, it destroys long-term mastery. It turns potential engineers into prompt-dependent operators, leading to un-debuggable technical debt and a de-skilled workforce.

## The Solution

Vibe-Check intercepts complex AI code injections before they become permanent. It does not fight AI; it holds the developer accountable for using it.

## Core Features

- The Socratic Lock: When a developer accepts a large or complex AI suggestion, Vibe-Check instantly applies a visual blur to the injected code, rendering it unreadable but preserving the structure.
- Claude 3.5 Sonnet Integration: The extension extracts the highest-risk chunk of the blurred code and sends a micro-payload to the Claude 3.5 Sonnet API. Claude acts as a Senior Mentor, generating a targeted multiple-choice question about the logic's edge cases or architectural concepts.
- Comprehension Verification: The developer must answer the Socratic challenge correctly in the sidebar Webview to un-blur the code.
- The Emergency Bypass & Accountability: If fixing a production outage, developers can bypass the lock. However, doing so automatically logs the skipped code to a local VIBE_DEBT.md file, forcing accountability for unverified logic.

## Built for Emerging Hubs (Data Efficiency)

AI tools typically stream massive amounts of workspace context, burning through expensive mobile data. Vibe-Check is engineered for environments like Ghana where data is a premium. It relies on local parsing to isolate the specific 20 to 30 lines of high-risk code, sending only a 2KB micro-payload to the Anthropic API.

## Technical Architecture (MVP)

- Editor Environment: VS Code Extension API (TypeScript).
- Interception Engine: Real-time onDidChangeTextDocument listeners to trap bulk text insertions (simulating post-acceptance Copilot injections).
- LLM Orchestration: Claude 3.5 Sonnet API governed by strict JSON-output system prompts.
- State Management: Local Node fs module for writing and tracking Technical Debt logs.

## Installation & Local Setup

To run Vibe-Check locally for testing:

1. Clone this repository.
2. Run npm install in the root directory.
3. Open the project in VS Code.
4. Press F5 to open a new Extension Development Host window.
5. In the new window, open the Vibe-Check sidebar panel and enter your Anthropic API Key.
6. Paste a complex block of code into the editor to trigger the Socratic Lock.

## Team: Ananse Architects

- Emmanuel Paddy Adams
- Ryan Nii Akwei Brown

AI is a tool. You are the engineer.

