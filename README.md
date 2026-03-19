# Ticket Generator Pro

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat&logo=googlechrome&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Google-4285F4?style=flat&logo=google&logoColor=white)

> A Chrome extension that converts task descriptions into standardized ticket format using AI — supports Gemini, Groq, Mistral, and OpenRouter.

## About

Ticket Generator Pro is a Chrome/Edge extension that transforms freeform task descriptions into properly formatted tickets using AI. Features multi-provider support (Gemini, Groq, Mistral, OpenRouter), right-click context menu integration, ticket history, customizable templates, and auto-repair for malformed outputs. Built with Manifest V3.

## Tech Stack

- **Language:** JavaScript, HTML, CSS
- **Platform:** Chrome Extension (Manifest V3)
- **AI Providers:** Gemini, Groq, Mistral, OpenRouter
- **Storage:** Chrome Storage API

## Features

- **Multi-AI provider support** — choose between Gemini, Groq, Mistral, or OpenRouter
- **Right-click conversion** — select text anywhere, right-click "Convert selection to Ticket"
- **Popup interface** — paste or type task descriptions and generate formatted tickets
- **Smart formatting** — AI structures tickets with title, description, acceptance criteria, etc.
- **Auto-repair** — automatically fixes malformed ticket output
- **Ticket history** — saves past conversions for reference
- **Customizable templates** — define your own ticket format
- **Clipboard integration** — read from and copy to clipboard

## Getting Started

### Prerequisites

- Chrome or Edge browser
- API key for at least one provider (Gemini, Groq, Mistral, or OpenRouter)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/iampreetdave-max/ticket-format-tool.git
```

2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder
5. Configure your API key in the extension settings

### Usage

- Click the extension icon and paste a task description, or
- Right-click selected text on any page and choose "Convert selection to Ticket"

## Project Structure

```
ticket-format-tool/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker (AI calls, context menu)
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── create_icons.py        # Icon generator utility
├── generate-icons.html    # Icon generation helper
└── README.md
```

## License

This project is open source.
