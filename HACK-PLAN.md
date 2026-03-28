CLAUDE BUILDER HACKATHON 2026: MASTER PLAN
Team Name: Ananse Architects
Members: Emmanuel Paddy Adams, Ryan Nii Akwei Brown, Wisdom Ogbonna
Project Name: Vibe-Check (The Socratic Middleware)
Track: 3. Economic Empowerment & Education
Event Date: Saturday, March 28th, 2026
Location: R.S. Amegashie Auditorium, UGBS, University of Ghana, Legon
1. THE CORE NARRATIVE (Elevator Pitch)
The Hook: 90% of developers use AI to move faster. Speed without comprehension is a fast track to un-debuggable technical debt. We are losing the "Why" behind our code.
The Problem: "Vibe-coding" occurs when developers merge code they do not understand simply because it looks correct. In the context of education and economic empowerment in Africa, this is dangerous. If students use AI as a crutch rather than a mentor, they become prompt-dependent operators instead of highly skilled engineers.
The Solution: Vibe-Check is a VS Code extension that acts as a Socratic friction layer. It does not just provide code. It ensures the developer understands the code before they can use it. It blurs high-risk, AI-generated logic and requires the user to pass a 5-second comprehension challenge before unlocking the syntax.
The Slogan: Stop vibing, start engineering. (Empowering the next generation of African developers to own their code.)
2. THE THREE MANDATORY JUDGING QUESTIONS
We must be able to answer these perfectly during the 5-minute pitch and 2-minute Q&A.
A. Who are you building this for, and why do they need it?
We are building this for students and developers in emerging tech hubs (like Ghana) who are using AI to leapfrog traditional education. They need this because AI tools currently optimize for speed, which risks de-skilling the workforce. Vibe-Check gives them a Senior Mentor inside their IDE, ensuring they build deep technical mastery alongside their projects.
B. What could go wrong, and what would you do about it?
If the friction is too high, users will bypass the learning and uninstall the tool. We solve this using a dynamic "Confidence Score." The tool remains silent for boilerplate code and only triggers for complex logic or newly imported libraries. For production emergencies, we included a "Hotfix Mode" that instantly unlocks the code but logs the skipped learning into a local VIBE_DEBT.md accountability file.
C. How does this help people rather than make decisions for them?
Standard AI makes decisions for the user by writing and inserting the final code. Vibe-Check intercepts that process. It refuses to finalize the decision until the human proves they have the mental model to maintain the code. It keeps the human as the ultimate authority and preserves the dignity of the engineering craft.
3. TECHNICAL ARCHITECTURE & STACK
We are using the "Hybrid Approach" recommended by the hackathon.
Infrastructure (Option 1): We will use Claude Code in the terminal to help us rapidly build the VS Code extension boilerplate and React webviews.
Core Feature (Option 2): We will integrate the Claude 3.5 Sonnet API to power the Socratic Mentor that generates the comprehension challenges.
Editor Environment: VS Code Extension API (TypeScript).
Logic Parsing: Tree-sitter (for real-time Abstract Syntax Tree parsing to calculate code complexity locally).
Knowledge Anchoring: A Retrieval-Augmented Generation (RAG) pipeline querying official documentation to prevent AI hallucinations.
State Management: Local SQLite database to track the user's Mastery Dashboard and Confidence Scores.
4. THE DEMO SCENARIO (Script for Judging)
We need to show a clear "Fail to Success" pipeline.
Scenario: A student is trying to write a distributed lock using Redis. They have never used Redis before.
The Vibe-Coder Failure: The student asks an AI for the code. The AI provides a lock but forgets the Time-to-Live (TTL) parameter. The student pastes it blindly. Result: A permanent system freeze if the server crashes.
The Vibe-Check Intervention: The student tries the same prompt with our extension active.
The Lock: Vibe-Check detects a new library import and high logic complexity. It blurs the code block. A banner reads: "Distributed Logic Detected. Unlock Required."
The Challenge: The Socratic Mentor asks: "If your server crashes right now, this lock stays stuck forever. What parameter is missing to prevent this?"
The Resolution: The student selects "A TTL expiry value" from the multiple-choice options. The code unblurs, highlighting the corrected logic. The student actually learned the concept.
5. HACKATHON SCHEDULE & LOGISTICS (Saturday, March 28)
09:00 AM: Check-in & Registration (Arrive early to secure a good workspace and power outlets).
Opening Ceremony: Listen carefully for the specific Sponsor Sub-Challenges (QuiverTech/Swivel) to see if we can easily integrate their API for extra points.
Hacking Begins (The 4-Hour Sprint):
First Half (Hours 1 to 2): Ruthless execution of the MVP. No feature creep.
Second Half (Hours 3 to 4): Asset creation, demo recording, slide design, and pitch rehearsals.
Project Submission Deadline: Ensure the GitHub repo is public and the README is formatted clearly.
Judging & Demo Presentations: 5 minutes to pitch, 2 minutes for Q&A. The team will split the pitch. One handles the Social Impact narrative, another handles the Technical Architecture, and the third runs the live demo.
6. TONIGHT AND D-DAY CHECKLISTS
PRE-HACKATHON (Tonight, Friday)
We must do all pre-testing in a private repository to avoid disqualification over "pre-written" code.
Ensure all laptops have Node.js and the yo code VS Code extension generator installed globally.
Verify access to Claude API keys and Anthropic console.
Set up a PRIVATE GitHub repository named "ananse-architects-dry-run". Use this tonight to test the VS Code extension boilerplate and the Claude Code terminal prompts. Do not make this public.
Review the VS Code Extension API documentation specifically regarding TextEditorDecorationType (for the blur effect) and WebviewViewProvider (for the challenge UI).
D-DAY (Tomorrow Morning, Saturday)
The official build starts here.
Once the hackathon officially begins, create a brand new PUBLIC GitHub repository named "ananse-architects-vibe-check".
Run the yo code generator fresh in this new public directory.
Migrate successful logic from last night's dry run, ensuring your commit history starts fresh for the judges.
Draft the README.md early so the project looks professional from the very first commit.
7. SLIDE DECK OUTLINE (5-Minute Pitch)
This structure ensures we hit every rubric point: Real-World Impact, Technical Execution, Ethical Alignment, and Presentation Quality.
Slide 1: Title & The Hook
Visual: "Stop Vibing, Start Engineering."
Talking Point: Introduce Ananse Architects. State the problem of "Shadow Coding" and un-debuggable technical debt.
Slide 2: The Social Impact (Why Ghana needs this)
Visual: A junior developer staring blankly at a complex codebase.
Talking Point: AI is helping us build faster, but it is de-skilling our future engineers. We are trading long-term mastery for short-term speed.
Slide 3: The Solution (Project Overview)
Visual: High-level diagram showing LLM output passing through Vibe-Check before hitting the IDE.
Talking Point: Vibe-Check is a Socratic middleware. It intercepts complex AI code and requires the human to prove comprehension before unlocking it.
Slide 4: Execution Plan (How we built it today)
Visual: Our tech stack logos (VS Code, Claude API, Tree-sitter, SQLite).
Talking Point: We used Claude Code to scaffold the extension, local regex patterns for instant risk calculation, and Claude 3.5 Sonnet for generating the challenges in real-time.
Slide 5: Technical Pits (Stress-Testing the System)
Visual: The "Confidence Score" equation.
Talking Point: A major pitfall we anticipated was user annoyance. If the tool is too loud, developers will uninstall it. We solved this by building a dynamic risk engine. It only blurs code if it detects high cyclomatic complexity or an unverified library. We also built an "Emergency Bypass" that logs skipped learning to a VIBE_DEBT.md file.
Slide 6: Live Demo (or Video)
Visual: The Redis Lock scenario (Fail to Success).
Talking Point: Show the blur effect, the challenge pop-up, the correct answer selection, and the un-blurring.
Slide 7: Conclusion & Ethical Alignment
Visual: "AI is a tool. You are the engineer."
Talking Point: We are preserving human dignity in coding. We are ensuring developers maintain ownership of their work.
8. DETAILED EXECUTION PLAN (THE 4-HOUR SPRINT)
We have exactly 4 hours total. The first 2 hours are strictly for building the MVP. The final 2 hours are strictly for presentation assets and rehearsal. There is zero margin for error.
PART 1: DEVELOPMENT (Hours 1 to 2)
Phase 1: The UI Illusion & Hardcoded Trigger (Hour 1)
Goal: Prove we can intercept code, blur it in the editor, and simulate the Static Analysis engine.
Claude Code Prompt 1 (Scaffold): > "Scaffold a VS Code extension in TypeScript named 'vibe-check'. Create a command called 'vibecheck.analyzeBlock'. Implement a vscode.window.createTextEditorDecorationType that applies a CSS blur filter (filter: blur(5px)) to the currently selected text in the active editor. Register a WebviewViewProvider for the VS Code sidebar that displays a basic HTML UI with an 'Unlock' button."
Claude Code Prompt 2 (Trigger): > "Update the extension code. Add an event listener for vscode.workspace.onDidChangeTextDocument. If the user pastes or types a block of text that includes the exact string import redis, automatically select that block and trigger the 'vibecheck.analyzeBlock' command to blur it."
Phase 2: The Live API Call & Safety Net (Hour 2)
Goal: Connect the UI to Claude 3.5 Sonnet and implement the "Emergency Bypass" fallback.
Claude Code Prompt 1 (API Call): > "Update the WebviewViewProvider. Add a text input field for an Anthropic API key. Write a function that extracts the text currently covered by the blur decoration and sends it to the Claude 3.5 Sonnet API using the system prompt provided in our master JSON file. Parse the JSON response. Render the 'question' and 'options' array as HTML radio buttons in the Webview. Write logic to clear the blur decoration only if the user selects the index matching 'correctIndex'."
Claude Code Prompt 2 (Bypass): > "Add an 'Emergency Bypass' button to the Webview UI. When clicked, it must trigger a command that clears the blur decoration in the active editor instantly. It must also use the Node fs module to append a markdown table row to a VIBE_DEBT.md file in the root of the user's workspace. The log should record the timestamp, the active file name, and the reason 'Emergency Bypass'."
PART 2: PRESENTATION & POLISH (Hours 3 to 4)
Phase 3: Demo Recording & Slide Deck Creation (Hour 3)
Goal: Create a flawless video backup of the demo and build the visual narrative.
Action (Demo): Clear your desktop. Open a clean instance of VS Code. Walk through the Redis Lock scenario exactly as scripted in Section 4. Record the screen using OBS or QuickTime. Ensure the blur effect, the Claude UI, and the un-blur action are clearly visible.
Action (Slides): Transfer the outline from Section 7 into Canva or Google Slides. Keep text minimal. Focus on high-contrast visuals of the "Vibe-Coder" versus the "Engineer."
Phase 4: Pitch Rehearsal & Submission (Hour 4)
Goal: Lock in the timing and ensure all deliverables are submitted properly.
Action (Rehearsal): Stand up. Run the presentation from start to finish with a timer. Assign speaking roles strictly. If the pitch goes over 4 minutes and 45 seconds, cut words until it fits. The judges will cut your microphone at exactly 5 minutes.
Action (Submission): Polish the GitHub README. Ensure the repo is public. Add screenshots of the extension to the README. Submit the project link to the hackathon portal well before the deadline hits to avoid server crash issues.
The Master System Prompt (Claude API payload)
When implementing Phase 2, this is the exact system instruction you must pass in the API payload. This forces Claude to return clean JSON without conversational filler.
{
  "system": "You are the Vibe-Check Socratic Mentor, an expert senior software engineer. Your goal is to test a junior developer's comprehension of a provided code snippet. Analyse the provided code snippet. Identify the most critical architectural concept, potential security risk, or edge case present in the logic. Generate a single multiple-choice question to test if the user understands this specific concept. You MUST respond in strict JSON format with exactly the following structure: {\"question\": \"The specific question text\", \"options\": [\"A plausible but incorrect answer\", \"Another plausible but incorrect answer\", \"The correct answer\", \"A totally wrong answer\"], \"correctIndex\": 2, \"explanation\": \"A one sentence explanation of why the correct answer is right.\"} Do not include any markdown formatting or text outside of the JSON object."
}

