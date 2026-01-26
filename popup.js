/**
 * Ticket Generator Pro - Main Popup Script
 * Supports multiple AI providers: Gemini, Groq, Mistral, OpenRouter
 */

// ========================================
// AI Provider Configurations
// ========================================

const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyName: 'Google AI Studio',
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
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyUrl: 'https://console.groq.com/keys',
    keyName: 'Groq Console',
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
    name: 'Mistral AI',
    url: 'https://api.mistral.ai/v1/chat/completions',
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyName: 'Mistral Console',
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
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyUrl: 'https://openrouter.ai/keys',
    keyName: 'OpenRouter',
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

const MAX_HISTORY_ITEMS = 50;

const REQUIRED_SECTIONS = [
  'Story',
  'Details',
  'Definition of Done',
  'Operational Updates',
  '<Add Requirements Here>',
  'Code Updates / Deployments'
];

// ========================================
// DOM Elements
// ========================================

const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // API Key
  apiSection: document.getElementById('apiSection'),
  apiToggle: document.getElementById('apiToggle'),
  aiProvider: document.getElementById('aiProvider'),
  providerInfo: document.getElementById('providerInfo'),
  providerLink: document.getElementById('providerLink'),
  apiKey: document.getElementById('apiKey'),
  toggleKeyVis: document.getElementById('toggleKeyVis'),
  saveKey: document.getElementById('saveKey'),
  keyBadge: document.getElementById('keyBadge'),

  // Task Input
  ticketType: document.getElementById('ticketType'),
  roleSelect: document.getElementById('roleSelect'),
  taskInput: document.getElementById('taskInput'),
  useSelectionBtn: document.getElementById('useSelectionBtn'),
  useClipboardBtn: document.getElementById('useClipboardBtn'),

  // Options
  quickMode: document.getElementById('quickMode'),
  minimalAssumptions: document.getElementById('minimalAssumptions'),
  detailedOutput: document.getElementById('detailedOutput'),

  // Actions
  convertBtn: document.getElementById('convertBtn'),
  clearBtn: document.getElementById('clearBtn'),
  statusBar: document.getElementById('statusBar'),
  statusText: document.getElementById('statusText'),

  // Output
  outputText: document.getElementById('outputText'),
  copyBtn: document.getElementById('copyBtn'),
  copyMarkdownBtn: document.getElementById('copyMarkdownBtn'),

  // History
  historyBtn: document.getElementById('historyBtn'),
  historySearch: document.getElementById('historySearch'),
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),

  // Settings
  settingsBtn: document.getElementById('settingsBtn'),
  projectName: document.getElementById('projectName'),
  repoUrl: document.getElementById('repoUrl'),
  defaultTicketType: document.getElementById('defaultTicketType'),
  defaultRole: document.getElementById('defaultRole'),
  defaultDod: document.getElementById('defaultDod'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  importFile: document.getElementById('importFile')
};

// ========================================
// State
// ========================================

let state = {
  provider: 'groq',
  apiKeys: {},
  settings: {
    projectName: '',
    repoUrl: '',
    defaultTicketType: 'Feature',
    defaultRole: 'Business Analyst',
    defaultDod: ''
  },
  history: [],
  options: {
    quickMode: false,
    minimalAssumptions: false,
    detailedOutput: false
  }
};

// ========================================
// Initialization
// ========================================

async function init() {
  await loadStoredData();
  await checkPendingConversion();
  applyDefaults();
  updateProviderInfo();
  attachEventListeners();
  renderHistory();
}

async function loadStoredData() {
  try {
    const data = await chrome.storage.local.get([
      'provider',
      'apiKeys',
      'settings',
      'history',
      'options'
    ]);

    if (data.provider) {
      state.provider = data.provider;
      elements.aiProvider.value = data.provider;
    }

    if (data.apiKeys) {
      state.apiKeys = data.apiKeys;
      const currentKey = state.apiKeys[state.provider];
      if (currentKey) {
        elements.apiKey.value = currentKey;
        updateKeyBadge(true);
        elements.apiSection.classList.add('collapsed');
      }
    }

    if (data.settings) {
      state.settings = { ...state.settings, ...data.settings };
      elements.projectName.value = state.settings.projectName || '';
      elements.repoUrl.value = state.settings.repoUrl || '';
      elements.defaultTicketType.value = state.settings.defaultTicketType || 'Feature';
      elements.defaultRole.value = state.settings.defaultRole || 'Business Analyst';
      elements.defaultDod.value = state.settings.defaultDod || '';
    }

    if (data.history) {
      state.history = data.history;
    }

    if (data.options) {
      state.options = { ...state.options, ...data.options };
      elements.quickMode.checked = state.options.quickMode;
      elements.minimalAssumptions.checked = state.options.minimalAssumptions;
      elements.detailedOutput.checked = state.options.detailedOutput;
    }
  } catch (error) {
    console.error('Failed to load stored data:', error);
  }
}

async function checkPendingConversion() {
  try {
    const data = await chrome.storage.local.get(['pendingConversion']);
    if (data.pendingConversion) {
      const { text, sourceUrl, timestamp } = data.pendingConversion;

      if (Date.now() - timestamp < 5000) {
        elements.taskInput.value = text;
        setStatus('', `Loaded selection from: ${new URL(sourceUrl).hostname}`);

        if (state.apiKeys[state.provider]) {
          setTimeout(() => convertToTicket(), 500);
        }
      }

      await chrome.storage.local.remove(['pendingConversion']);
    }
  } catch (error) {
    console.error('Failed to check pending conversion:', error);
  }
}

function applyDefaults() {
  elements.ticketType.value = state.settings.defaultTicketType || 'Feature';
  elements.roleSelect.value = state.settings.defaultRole || 'Business Analyst';
}

function updateProviderInfo() {
  const provider = AI_PROVIDERS[state.provider];
  elements.providerLink.href = provider.keyUrl;
  elements.providerLink.textContent = provider.keyName;

  // Load the API key for this provider
  const savedKey = state.apiKeys[state.provider];
  elements.apiKey.value = savedKey || '';
  updateKeyBadge(!!savedKey);
}

// ========================================
// Event Listeners
// ========================================

function attachEventListeners() {
  // Tab navigation
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  elements.historyBtn.addEventListener('click', () => switchTab('history'));
  elements.settingsBtn.addEventListener('click', () => switchTab('settings'));

  // Provider change
  elements.aiProvider.addEventListener('change', onProviderChange);

  // API Key
  elements.apiToggle.addEventListener('click', toggleApiSection);
  elements.toggleKeyVis.addEventListener('click', toggleKeyVisibility);
  elements.saveKey.addEventListener('click', saveApiKey);
  elements.apiKey.addEventListener('input', () => updateKeyBadge(false));

  // Task Input
  elements.useSelectionBtn.addEventListener('click', useSelectedText);
  elements.useClipboardBtn.addEventListener('click', useClipboard);

  // Options
  elements.quickMode.addEventListener('change', saveOptions);
  elements.minimalAssumptions.addEventListener('change', saveOptions);
  elements.detailedOutput.addEventListener('change', saveOptions);

  // Actions
  elements.convertBtn.addEventListener('click', convertToTicket);
  elements.clearBtn.addEventListener('click', clearAll);

  // Output
  elements.copyBtn.addEventListener('click', copyOutput);
  elements.copyMarkdownBtn.addEventListener('click', copyAsMarkdown);

  // History
  elements.historySearch.addEventListener('input', filterHistory);
  elements.clearHistoryBtn.addEventListener('click', clearHistory);

  // Settings
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.exportDataBtn.addEventListener('click', exportData);
  elements.importDataBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', importData);

  // Keyboard shortcuts
  elements.taskInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      convertToTicket();
    }
  });
}

// ========================================
// Provider Management
// ========================================

async function onProviderChange() {
  state.provider = elements.aiProvider.value;
  updateProviderInfo();

  try {
    await chrome.storage.local.set({ provider: state.provider });
  } catch (error) {
    console.error('Failed to save provider:', error);
  }
}

// ========================================
// Tab Navigation
// ========================================

function switchTab(tabId) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}Tab`);
  });
}

// ========================================
// API Key Management
// ========================================

function toggleApiSection() {
  elements.apiSection.classList.toggle('collapsed');
}

function toggleKeyVisibility() {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
}

async function saveApiKey() {
  const key = elements.apiKey.value.trim();

  if (!key) {
    setStatus('error', 'Please enter an API key');
    return;
  }

  state.apiKeys[state.provider] = key;

  try {
    await chrome.storage.local.set({ apiKeys: state.apiKeys });
    updateKeyBadge(true);
    setStatus('success', `${AI_PROVIDERS[state.provider].name} API key saved`);
    elements.apiSection.classList.add('collapsed');
  } catch (error) {
    setStatus('error', 'Failed to save API key');
  }
}

function updateKeyBadge(isSaved) {
  elements.keyBadge.textContent = isSaved ? 'Saved' : 'Not Set';
  elements.keyBadge.classList.toggle('saved', isSaved);
}

// ========================================
// Input Helpers
// ========================================

async function useSelectedText() {
  try {
    setStatus('loading', 'Getting selection...');

    const response = await chrome.runtime.sendMessage({ action: 'getSelectedText' });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.text) {
      elements.taskInput.value = response.text;
      setStatus('success', 'Selection loaded');
    } else {
      setStatus('error', 'No text selected');
    }
  } catch (error) {
    setStatus('error', error.message || 'Failed to get selection');
  }
}

async function useClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      elements.taskInput.value = text;
      setStatus('success', 'Pasted from clipboard');
    } else {
      setStatus('error', 'Clipboard is empty');
    }
  } catch (error) {
    setStatus('error', 'Failed to read clipboard');
  }
}

// ========================================
// Options Management
// ========================================

async function saveOptions() {
  state.options = {
    quickMode: elements.quickMode.checked,
    minimalAssumptions: elements.minimalAssumptions.checked,
    detailedOutput: elements.detailedOutput.checked
  };

  try {
    await chrome.storage.local.set({ options: state.options });
  } catch (error) {
    console.error('Failed to save options:', error);
  }
}

// ========================================
// Ticket Conversion
// ========================================

async function convertToTicket() {
  const apiKey = elements.apiKey.value.trim() || state.apiKeys[state.provider];
  const task = elements.taskInput.value.trim();
  const role = elements.roleSelect.value;
  const ticketType = elements.ticketType.value;

  // Validation
  if (!apiKey) {
    setStatus('error', 'Please enter your API key');
    elements.apiSection.classList.remove('collapsed');
    elements.apiKey.focus();
    return;
  }

  if (!task) {
    setStatus('error', 'Please enter a task description');
    elements.taskInput.focus();
    return;
  }

  setLoading(true);
  setStatus('loading', `Generating with ${AI_PROVIDERS[state.provider].name}...`);
  elements.outputText.value = '';

  try {
    const prompt = buildPrompt(task, role, ticketType);
    const provider = AI_PROVIDERS[state.provider];
    const { url, options } = provider.buildRequest(prompt, apiKey);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    let ticketText = provider.extractText(data);

    if (!ticketText) {
      throw new Error('No content received from API');
    }

    // Validate and repair if needed
    if (!validateTicketFormat(ticketText)) {
      setStatus('loading', 'Fixing format...');
      ticketText = await repairTicketFormat(apiKey, ticketText, role, ticketType);
    }

    ticketText = cleanTicketOutput(ticketText);

    elements.outputText.value = ticketText;
    setStatus('success', 'Ticket generated!');

    // Save to history
    await addToHistory({
      input: task,
      output: ticketText,
      ticketType,
      role,
      provider: state.provider,
      sourceUrl: await getCurrentTabUrl()
    });

    // Auto-copy if Quick Mode
    if (state.options.quickMode) {
      await copyOutput();
    }

  } catch (error) {
    console.error('Conversion failed:', error);
    setStatus('error', error.message);
    elements.outputText.value = `Error: ${error.message}\n\nTroubleshooting:\n- Check that your API key is valid\n- Ensure you have API quota remaining\n- Try a different AI provider`;
  } finally {
    setLoading(false);
  }
}

function buildPrompt(task, role, ticketType) {
  const { minimalAssumptions, detailedOutput } = state.options;
  const { defaultDod, projectName } = state.settings;

  let constraints = '';
  if (minimalAssumptions) {
    constraints += '\n\nIMPORTANT CONSTRAINTS:';
    constraints += '\n- Do NOT invent or assume specific technologies, tools, or environments not mentioned';
    constraints += '\n- Do NOT make up implementation details';
    constraints += '\n- If information is unclear, add clarifying questions in Operational Updates as bullets';
  }

  if (detailedOutput) {
    constraints += '\n\nDETAIL REQUIREMENTS:';
    constraints += '\n- Provide thorough, comprehensive bullet points';
    constraints += '\n- Include detailed implementation considerations in Details';
    constraints += '\n- Add extensive Definition of Done checklist items';
  }

  const projectContext = projectName ? `\nPROJECT: ${projectName}` : '';
  const dodItems = defaultDod ? `\n\nInclude these Definition of Done items:\n${defaultDod}` : '';

  return `You are a ticket formatting assistant. Convert the task below into the EXACT format specified.

TICKET TYPE: ${ticketType}${projectContext}

TASK:
${task}
${constraints}${dodItems}

OUTPUT THIS EXACT FORMAT (no deviations, no markdown code blocks):

Story
As a ${role}
I want to [extract the main action from the task]
so that I can [extract the goal/benefit]

Details
[Convert task into clear bullet points]
[Write for another developer to understand]
[Include all scope items]

Definition of Done
[Create relevant checklist items]
[Include testing and review items]

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

RULES:
- Output ONLY the ticket - no intro, no explanation
- Use bullet points where appropriate
- Start directly with "Story" (no markdown, no code blocks)
- Keep it clear and readable`;
}

function validateTicketFormat(text) {
  return REQUIRED_SECTIONS.every(section => text.includes(section));
}

async function repairTicketFormat(apiKey, invalidText, role, ticketType) {
  const provider = AI_PROVIDERS[state.provider];

  const repairPrompt = `The ticket below is malformed. Reformat it to match the EXACT structure.

MALFORMED TICKET:
${invalidText}

REQUIRED FORMAT:

Story
As a ${role}
I want to [action]
so that I can [goal]

Details
[bullets]

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

Output ONLY the fixed ticket. Start with "Story".`;

  try {
    const { url, options } = provider.buildRequest(repairPrompt, apiKey);
    const response = await fetch(url, options);

    if (response.ok) {
      const data = await response.json();
      const repairedText = provider.extractText(data);

      if (repairedText && validateTicketFormat(repairedText)) {
        return repairedText;
      }
    }
  } catch (error) {
    console.error('Repair failed:', error);
  }

  return invalidText;
}

function cleanTicketOutput(text) {
  text = text.replace(/^```[\w]*\n?/gm, '');
  text = text.replace(/\n?```$/gm, '');
  text = text.trim();

  const storyIndex = text.indexOf('Story');
  if (storyIndex > 0) {
    text = text.substring(storyIndex);
  }

  return text;
}

// ========================================
// Output Actions
// ========================================

async function copyOutput() {
  const text = elements.outputText.value;

  if (!text) {
    setStatus('error', 'Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback(elements.copyBtn, 'Copied!');
    setStatus('success', 'Copied to clipboard');
  } catch (error) {
    setStatus('error', 'Failed to copy');
  }
}

async function copyAsMarkdown() {
  const text = elements.outputText.value;

  if (!text) {
    setStatus('error', 'Nothing to copy');
    return;
  }

  const markdown = convertToMarkdown(text);

  try {
    await navigator.clipboard.writeText(markdown);
    showCopyFeedback(elements.copyMarkdownBtn, 'Copied!');
    setStatus('success', 'Markdown copied');
  } catch (error) {
    setStatus('error', 'Failed to copy');
  }
}

function convertToMarkdown(text) {
  let md = text;
  md = md.replace(/^(Story|Details|Definition of Done|Operational Updates|Code Updates \/ Deployments)$/gm, '## $1');
  md = md.replace(/^([•●-])\s*/gm, '- ');
  return md;
}

function showCopyFeedback(button, text) {
  const originalHtml = button.innerHTML;
  button.classList.add('copied');
  button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${text}`;

  setTimeout(() => {
    button.classList.remove('copied');
    button.innerHTML = originalHtml;
  }, 2000);
}

// ========================================
// History Management
// ========================================

async function addToHistory(item) {
  const historyItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...item
  };

  state.history.unshift(historyItem);

  if (state.history.length > MAX_HISTORY_ITEMS) {
    state.history = state.history.slice(0, MAX_HISTORY_ITEMS);
  }

  try {
    await chrome.storage.local.set({ history: state.history });
    renderHistory();
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

function renderHistory(filter = '') {
  const filtered = filter
    ? state.history.filter(item =>
        item.input.toLowerCase().includes(filter.toLowerCase()) ||
        item.output.toLowerCase().includes(filter.toLowerCase())
      )
    : state.history;

  if (filtered.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <p>${filter ? 'No matching history' : 'No history yet'}</p>
        <span>${filter ? 'Try a different search' : 'Converted tickets will appear here'}</span>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = filtered.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-header">
        <span class="history-item-type">${item.ticketType}</span>
        <span class="history-item-time">${formatTime(item.timestamp)}</span>
      </div>
      <div class="history-item-preview">${escapeHtml(item.input.substring(0, 80))}${item.input.length > 80 ? '...' : ''}</div>
      <div class="history-item-actions">
        <button type="button" class="btn-xs load-history" data-id="${item.id}">Load</button>
        <button type="button" class="btn-xs delete-history" data-id="${item.id}">Delete</button>
      </div>
    </div>
  `).join('');

  elements.historyList.querySelectorAll('.load-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      loadHistoryItem(btn.dataset.id);
    });
  });

  elements.historyList.querySelectorAll('.delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(btn.dataset.id);
    });
  });

  elements.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => loadHistoryItem(item.dataset.id));
  });
}

function loadHistoryItem(id) {
  const item = state.history.find(h => h.id === parseInt(id));
  if (item) {
    elements.taskInput.value = item.input;
    elements.outputText.value = item.output;
    elements.ticketType.value = item.ticketType;
    elements.roleSelect.value = item.role;
    switchTab('main');
    setStatus('success', 'History item loaded');
  }
}

async function deleteHistoryItem(id) {
  state.history = state.history.filter(h => h.id !== parseInt(id));

  try {
    await chrome.storage.local.set({ history: state.history });
    renderHistory(elements.historySearch.value);
    setStatus('success', 'Item deleted');
  } catch (error) {
    setStatus('error', 'Failed to delete');
  }
}

async function clearHistory() {
  if (!confirm('Delete all history?')) return;

  state.history = [];

  try {
    await chrome.storage.local.set({ history: [] });
    renderHistory();
    setStatus('success', 'History cleared');
  } catch (error) {
    setStatus('error', 'Failed to clear history');
  }
}

function filterHistory() {
  renderHistory(elements.historySearch.value);
}

// ========================================
// Settings Management
// ========================================

async function saveSettings() {
  state.settings = {
    projectName: elements.projectName.value.trim(),
    repoUrl: elements.repoUrl.value.trim(),
    defaultTicketType: elements.defaultTicketType.value,
    defaultRole: elements.defaultRole.value,
    defaultDod: elements.defaultDod.value.trim()
  };

  try {
    await chrome.storage.local.set({ settings: state.settings });
    applyDefaults();
    setStatus('success', 'Settings saved');
  } catch (error) {
    setStatus('error', 'Failed to save settings');
  }
}

async function exportData() {
  const data = {
    provider: state.provider,
    settings: state.settings,
    history: state.history,
    options: state.options,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-generator-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
  setStatus('success', 'Data exported');
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.settings) {
      state.settings = { ...state.settings, ...data.settings };
      await chrome.storage.local.set({ settings: state.settings });
    }

    if (data.history) {
      state.history = data.history;
      await chrome.storage.local.set({ history: state.history });
    }

    if (data.options) {
      state.options = { ...state.options, ...data.options };
      await chrome.storage.local.set({ options: state.options });
    }

    await loadStoredData();
    renderHistory();
    setStatus('success', 'Data imported');
  } catch (error) {
    setStatus('error', 'Invalid import file');
  }

  event.target.value = '';
}

// ========================================
// UI Helpers
// ========================================

function setStatus(type, message) {
  elements.statusBar.className = `status-bar ${type}`;
  elements.statusText.textContent = message;
}

function setLoading(isLoading) {
  const btnText = elements.convertBtn.querySelector('.btn-text');
  const btnLoader = elements.convertBtn.querySelector('.btn-loader');

  elements.convertBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'Converting...' : 'Convert to Ticket';
  btnLoader.hidden = !isLoading;
}

function clearAll() {
  elements.taskInput.value = '';
  elements.outputText.value = '';
  setStatus('', 'Ready');
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function getCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url || '';
  } catch {
    return '';
  }
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', init);
