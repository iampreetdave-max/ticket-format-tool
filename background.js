/**
 * Ticket Generator Pro - Background Service Worker
 * Handles context menu and cross-tab communication
 * Supports multiple AI providers
 */

// AI Provider Configurations (same as popup.js)
const AI_PROVIDERS = {
  gemini: {
    buildRequest: (prompt, apiKey) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    }),
    extractText: (response) => response.candidates?.[0]?.content?.parts?.[0]?.text || ''
  },
  groq: {
    buildRequest: (prompt, apiKey) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    }),
    extractText: (response) => response.choices?.[0]?.message?.content || ''
  },
  mistral: {
    buildRequest: (prompt, apiKey) => ({
      url: 'https://api.mistral.ai/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    }),
    extractText: (response) => response.choices?.[0]?.message?.content || ''
  },
  openrouter: {
    buildRequest: (prompt, apiKey) => ({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'chrome-extension://ticket-generator',
          'X-Title': 'Ticket Generator Pro'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    }),
    extractText: (response) => response.choices?.[0]?.message?.content || ''
  }
};

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'convertToTicket',
    title: 'Convert selection to Ticket',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'convertToTicket' && info.selectionText) {
    try {
      // Store the selected text for the popup to use
      await chrome.storage.local.set({
        pendingConversion: {
          text: info.selectionText,
          sourceUrl: tab.url,
          timestamp: Date.now()
        }
      });

      // Open the popup
      await chrome.action.openPopup();
    } catch (error) {
      console.error('Context menu conversion failed:', error);
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSelectedText') {
    getSelectedTextFromTab()
      .then(text => sendResponse({ text }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.action === 'convertInBackground') {
    convertTicketInBackground(message.data)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

/**
 * Get selected text from the active tab
 */
async function getSelectedTextFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    throw new Error('Cannot access selection on this page');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || ''
  });

  if (results && results[0]?.result) {
    return results[0].result;
  }

  return '';
}

/**
 * Convert ticket in background
 */
async function convertTicketInBackground(data) {
  const { provider, apiKey, task, role, ticketType, options, settings } = data;

  const providerConfig = AI_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error('Invalid provider');
  }

  const prompt = buildPrompt(task, role, ticketType, options, settings);
  const { url, options: fetchOptions } = providerConfig.buildRequest(prompt, apiKey);

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const responseData = await response.json();
  let ticketText = providerConfig.extractText(responseData);

  if (!ticketText) {
    throw new Error('No content received from API');
  }

  // Validate format
  if (!validateTicketFormat(ticketText)) {
    ticketText = await repairTicketFormat(provider, apiKey, ticketText, role, ticketType);
  }

  return ticketText;
}

/**
 * Build the prompt for the AI
 */
function buildPrompt(task, role, ticketType, options, settings) {
  const { minimalAssumptions, detailedOutput } = options || {};
  const defaultDod = settings?.defaultDod || '';

  let constraints = '';
  if (minimalAssumptions) {
    constraints += '\n- Do NOT invent or assume any specific technologies, tools, or environments.';
  }
  if (detailedOutput) {
    constraints += '\n- Provide detailed bullet points in Details and Definition of Done sections.';
  }

  const dodSection = defaultDod ? `\nDefault DoD items:\n${defaultDod}` : '';

  return `You are a ticket formatting assistant. Convert the task into the EXACT format below.

TICKET TYPE: ${ticketType}

TASK:
${task}
${constraints}${dodSection}

OUTPUT THIS EXACT FORMAT:

Story
As a ${role}
I want to [action from task]
so that I can [goal from task]

Details
[bullet points]

Definition of Done
[checklist]

Operational Updates

<Add Requirements Here>

Code Updates / Deployments

Code review complete (Git Approval Link)

Code merged to main branch (Git Merge Link)

And

Customer notified of Code Merge

Or

Changes deployed in all environments

Documentation updated

GitLab Pages

The Source

Team briefing or cross training

Peer review and feedback incorporated (if any)

PO review and feedback incorporated (if any)

===================================================

Output ONLY the ticket. Start with "Story".`;
}

/**
 * Validate ticket format
 */
function validateTicketFormat(text) {
  const required = ['Story', 'Details', 'Definition of Done', 'Operational Updates', 'Code Updates / Deployments'];
  return required.every(section => text.includes(section));
}

/**
 * Repair invalid ticket format
 */
async function repairTicketFormat(provider, apiKey, invalidText, role, ticketType) {
  const providerConfig = AI_PROVIDERS[provider];

  const repairPrompt = `Reformat this malformed ticket to match the required structure:

${invalidText}

Required format starts with "Story" and includes: Details, Definition of Done, Operational Updates, Code Updates / Deployments.

Output ONLY the fixed ticket.`;

  try {
    const { url, options } = providerConfig.buildRequest(repairPrompt, apiKey);
    const response = await fetch(url, options);

    if (response.ok) {
      const data = await response.json();
      const repairedText = providerConfig.extractText(data);
      if (repairedText && validateTicketFormat(repairedText)) {
        return repairedText;
      }
    }
  } catch (error) {
    console.error('Repair failed:', error);
  }

  return invalidText;
}
