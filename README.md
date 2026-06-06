# Ticket Generator Pro

![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?style=flat&logo=googlechrome&logoColor=white)

A Chrome extension that converts free-form task descriptions into a standardized, structured ticket using your choice of LLM provider.

## Overview

Ticket Generator Pro lives in the browser toolbar and turns rough notes, selected page text, or clipboard contents into a consistently formatted ticket (Story, Details, Definition of Done, Operational Updates, and Code Updates / Deployments sections). It is built for teams that want every ticket to follow the same template without hand-formatting each one.

You bring your own API key for one of four supported providers; requests go directly from the browser to that provider. Generated tickets are validated against the required structure and, if a section is missing, the extension automatically asks the model to repair the format. A local history of past conversions, reusable defaults, and import/export round out the workflow.

## Key Features

- **Multiple LLM providers** — Google Gemini, Groq, Mistral, and OpenRouter, each selectable at runtime with its own stored key.
- **Standardized ticket format** — enforces a fixed section structure and validates that required sections are present.
- **Automatic format repair** — if validation fails, the extension re-prompts the model to reformat the output, then strips stray code fences.
- **Multiple input sources** — type directly, pull the current page selection, or paste from the clipboard; a right-click context menu converts selected text.
- **Generation options** — Quick Mode (auto-copy on success), Minimal Assumptions (discourage invented details), and Detailed Output.
- **Local history** — up to 50 recent conversions, searchable, with load and delete actions.
- **Settings & defaults** — project name, repo URL, default ticket type, default role, and default Definition-of-Done items.
- **Backup** — export and import all settings, history, and options as JSON.
- **Markdown export** — copy the ticket as plain text or as Markdown with headings.

All data (keys, settings, history) is stored locally via `chrome.storage.local`.

## How It Works

The popup (`popup.html` / `popup.js`) builds a prompt from the task text, selected role, ticket type, and active options, then calls the selected provider's chat/completions endpoint. A provider abstraction (`AI_PROVIDERS`) maps each provider to its request shape and response parser, so adding or switching providers is uniform. The background service worker (`background.js`) registers the context-menu action, reads the active tab's selection via scripting injection, and mirrors the same provider logic for background conversions. Output is validated, optionally repaired, cleaned, and saved to history.

## Tech Stack

- Chrome Extension, Manifest V3 (service worker background)
- Vanilla JavaScript, HTML, CSS (no build step)
- `chrome.storage`, `contextMenus`, `scripting`, and clipboard APIs
- LLM provider HTTP APIs: Gemini, Groq, Mistral, OpenRouter
- `create_icons.py` / `generate-icons.html` for generating extension icons

## Getting Started

### Prerequisites

- Google Chrome (or a Chromium-based browser supporting Manifest V3)
- An API key for at least one supported provider (Gemini, Groq, Mistral, or OpenRouter)

### Install (load unpacked)

1. Clone the repository:
   ```bash
   git clone https://github.com/iampreetdave-max/ticket-format-tool.git
   ```
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open the extension popup, choose a provider, paste your API key, and save.

> Icons are referenced from an `icons/` folder. If they are missing, generate them with `generate-icons.html` (open in a browser) or `create_icons.py`.

### Usage

- Open the popup, paste or load a task description, pick a ticket type and role, then **Convert to Ticket**.
- Or select text on any page, right-click, and choose **Convert selection to Ticket**.
- Copy the result as text or Markdown.

## Configuration

API keys are entered through the popup UI and saved per provider in `chrome.storage.local` — they are never hardcoded in the repository. Settings (project name, repo URL, default ticket type/role, default Definition of Done) and generation options are configured in the Settings and main tabs.

## Project Structure

```
ticket-format-tool/
├── manifest.json          # Manifest V3 definition (permissions, action, background)
├── popup.html             # Extension popup UI
├── popup.css              # Popup styles
├── popup.js               # Main logic: providers, prompt, validation, history, settings
├── background.js          # Service worker: context menu, selection capture, background convert
├── create_icons.py        # Icon generation script
├── generate-icons.html    # Browser-based icon generator
└── README.md
```
