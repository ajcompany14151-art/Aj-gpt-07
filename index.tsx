/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat } from "@google/genai";

// --- TYPES ---
type Message = {
    role: 'user' | 'model';
    parts: { text: string }[];
    timestamp?: string;
};
type ChatSession = {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
};

// --- GLOBAL DECLARATIONS ---
declare const hljs: any;

// --- UI ELEMENTS ---
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement;
const chatHistoryList = document.getElementById('chat-history') as HTMLUListElement;
const mainContent = document.getElementById('main-content') as HTMLElement;
const toastElement = document.getElementById('toast') as HTMLDivElement;
const mobileMenuBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const clearChatBtn = document.getElementById('clear-chat-btn') as HTMLButtonElement;
const exportChatBtn = document.getElementById('export-chat-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const closeSettingsBtn = document.getElementById('close-settings') as HTMLButtonElement;
const saveSettingsBtn = document.getElementById('save-settings') as HTMLButtonElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const temperatureSlider = document.getElementById('temperature') as HTMLInputElement;
const maxTokensInput = document.getElementById('max-tokens') as HTMLInputElement;
const searchHistoryInput = document.getElementById('search-history') as HTMLInputElement;
const attachBtn = document.getElementById('attach-btn') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const typingIndicator = document.getElementById('typing-indicator') as HTMLDivElement;
const contextMenu = document.getElementById('context-menu') as HTMLDivElement;
const renameChatOption = document.getElementById('rename-chat') as HTMLLIElement;
const deleteChatOption = document.getElementById('delete-chat') as HTMLLIElement;

// --- STATE ---
let chat: Chat;
let currentChatId: string | null = null;
let chatHistory: ChatSession[] = [];
let isAwaitingResponse = false;
let settings = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 1000
};
let contextMenuTarget: HTMLElement | null = null;

// --- ICONS ---
const ICONS = {
    regenerate: `<i class="fas fa-redo"></i>`,
    copy: `<i class="fas fa-copy"></i>`,
    download: `<i class="fas fa-download"></i>`,
    close: `<i class="fas fa-times"></i>`
};

// --- CORE FUNCTIONS ---

/**
 * Initializes the Generative AI model and chat session.
 */
function initializeChat(): Chat {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
      model: settings.model,
      config: {
        systemInstruction: 'You are AJ STUDIOZ AI AGENT, a professional, helpful, and friendly AI assistant designed by AJ STUDIOZ. Provide clear, accurate, and well-structured responses. When providing code, always use markdown code blocks with the appropriate language identifier.',
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
      },
    });
}

/**
 * Scrolls the chat container to the bottom.
 */
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Displays a short-lived notification to the user.
 * @param message The message to display in the toast.
 */
function showToast(message: string) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

/**
 * Formats a date for display.
 * @param date The date to format.
 * @returns A formatted date string.
 */
function formatDate(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a date for chat history.
 * @param date The date to format.
 * @returns A formatted date string.
 */
function formatDateForHistory(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${formatDate(date)}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${formatDate(date)}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}


// --- UI & THEME MANAGEMENT ---

/**
 * Toggles the sidebar's collapsed state on desktop.
 */
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
}

/**
 * Toggles the sidebar's open state on mobile.
 */
function toggleMobileMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

/**
 * Toggles between light and dark themes.
 */
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme icon
    const themeIcon = themeToggleBtn.querySelector('i');
    if (themeIcon) {
      themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

/**
 * Loads the saved theme from local storage.
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Update theme icon
    const themeIcon = themeToggleBtn.querySelector('i');
    if (themeIcon) {
      themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

/**
 * Shows or hides the settings modal.
 */
function toggleSettingsModal() {
  settingsModal.classList.toggle('active');
}

/**
 * Loads settings from local storage.
 */
function loadSettings() {
  const savedSettings = localStorage.getItem('settings');
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
    modelSelect.value = settings.model;
    temperatureSlider.value = settings.temperature.toString();
    maxTokensInput.value = settings.maxTokens.toString();
  }
}

/**
 * Saves settings to local storage.
 */
function saveSettings() {
  settings = {
    model: modelSelect.value,
    temperature: parseFloat(temperatureSlider.value),
    maxTokens: parseInt(maxTokensInput.value)
  };
  
  localStorage.setItem('settings', JSON.stringify(settings));
  showToast('Settings saved successfully!');
  toggleSettingsModal();
  
  // Reinitialize chat with new settings
  chat = initializeChat();
}

/**
 * Shows the typing indicator.
 */
function showTypingIndicator() {
  typingIndicator.style.display = 'flex';
}

/**
 * Hides the typing indicator.
 */
function hideTypingIndicator() {
  typingIndicator.style.display = 'none';
}

/**
 * Shows the context menu.
 * @param x The x position.
 * @param y The y position.
 * @param target The target element.
 */
function showContextMenu(x: number, y: number, target: HTMLElement) {
  contextMenuTarget = target;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('active');
}

/**
 * Hides the context menu.
 */
function hideContextMenu() {
  contextMenu.classList.remove('active');
  contextMenuTarget = null;
}

/**
 * Renames a chat session.
 */
function renameChat() {
  if (!contextMenuTarget) return;
  
  const chatId = contextMenuTarget.getAttribute('data-chat-id');
  if (!chatId) return;
  
  const session = chatHistory.find(s => s.id === chatId);
  if (!session) return;
  
  const newTitle = prompt('Enter new chat title:', session.title);
  if (newTitle && newTitle.trim() !== '') {
    session.title = newTitle.trim();
    session.updatedAt = new Date().toISOString();
    saveHistoryToStorage();
    renderHistoryList();
  }
  
  hideContextMenu();
}

/**
 * Deletes a chat session.
 */
function deleteChat() {
  if (!contextMenuTarget) return;
  
  const chatId = contextMenuTarget.getAttribute('data-chat-id');
  if (!chatId) return;
  
  if (confirm('Are you sure you want to delete this chat?')) {
    chatHistory = chatHistory.filter(s => s.id !== chatId);
    saveHistoryToStorage();
    
    if (currentChatId === chatId) {
      startNewChat();
    } else {
      renderHistoryList();
    }
  }
  
  hideContextMenu();
}

/**
 * Handles file attachment.
 */
function handleFileAttachment() {
  fileInput.click();
}

/**
 * Processes the attached file.
 */
async function processAttachedFile() {
  const file = fileInput.files?.[0];
  if (!file) return;
  
  // For simplicity, we'll just show a toast notification
  // In a real implementation, you would process the image and include it in the message
  showToast(`Attached: ${file.name}`);
  
  // Clear the file input
  fileInput.value = '';
}

/**
 * Exports the current chat as a text file.
 */
function exportChat() {
  if (!currentChatId) {
    showToast('No chat to export');
    return;
  }
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  let chatText = `AJ STUDIOZ AI AGENT - Chat Export\n\n`;
  chatText += `Title: ${session.title}\n`;
  chatText += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
  chatText += `Last Updated: ${new Date(session.updatedAt).toLocaleString()}\n\n`;
  chatText += `----------------------------------------\n\n`;
  
  session.messages.forEach(msg => {
    const sender = msg.role === 'user' ? 'You' : 'AJ STUDIOZ AI';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
    chatText += `[${time}] ${sender}:\n`;
    chatText += `${msg.parts[0].text}\n\n`;
  });
  
  const blob = new Blob([chatText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aj-studioz-chat-${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Chat exported successfully!');
}

/**
 * Clears the current chat.
 */
function clearCurrentChat() {
  if (confirm('Are you sure you want to clear the current chat?')) {
    startNewChat();
    showToast('Chat cleared');
  }
}

/**
 * Filters chat history based on search query.
 */
function filterChatHistory() {
  const query = searchHistoryInput.value.toLowerCase();
  const items = chatHistoryList.querySelectorAll('.history-item');
  
  items.forEach(item => {
    const title = item.textContent?.toLowerCase() || '';
    if (title.includes(query)) {
      (item as HTMLElement).style.display = '';
    } else {
      (item as HTMLElement).style.display = 'none';
    }
  });
}


// --- CHAT HISTORY MANAGEMENT ---

/**
 * Loads chat history from local storage.
 */
function loadHistoryFromStorage() {
    const savedHistory = localStorage.getItem('chatHistory');
    chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
}

/**
 * Saves the current chat history to local storage.
 */
function saveHistoryToStorage() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

/**
 * Renders the chat history list in the sidebar.
 */
function renderHistoryList() {
    chatHistoryList.innerHTML = '';
    chatHistory.forEach(session => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.setAttribute('data-chat-id', session.id);
        
        if (session.id === currentChatId) {
            li.classList.add('active');
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.textContent = session.title;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        timestampDiv.textContent = formatDateForHistory(new Date(session.updatedAt));
        
        li.appendChild(titleDiv);
        li.appendChild(timestampDiv);
        
        li.addEventListener('click', () => loadChatSession(session.id));
        
        // Add context menu event
        li.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu(e.clientX, e.clientY, li);
        });
        
        chatHistoryList.appendChild(li);
    });
}

/**
 * Loads a specific chat session into the main view.
 * @param chatId The ID of the chat session to load.
 */
function loadChatSession(chatId: string) {
    const session = chatHistory.find(s => s.id === chatId);
    if (!session) return;
    
    currentChatId = chatId;
    chatContainer.innerHTML = '';
    session.messages.forEach((msg, index) => {
        const isLastModelMessage = msg.role === 'model' && index === session.messages.length - 1;
        appendMessage(msg.role, msg.parts[0].text, { 
          isLastModelMessage,
          timestamp: msg.timestamp 
        });
    });
    chat = initializeChat(); // Re-initialize chat with history (if API supported it)
    renderHistoryList();
    scrollToBottom();
    
    if (window.innerWidth <= 800 && sidebar.classList.contains('open')) {
        toggleMobileMenu();
    }
}

/**
 * Creates a new chat session.
 */
function startNewChat() {
    currentChatId = null;
    chatContainer.innerHTML = '';
    showWelcomeScreen();
    chat = initializeChat();
    renderHistoryList();
    if (window.innerWidth <= 800 && sidebar.classList.contains('open')) {
        toggleMobileMenu();
    }
}

/**
 * Saves the current messages to a chat session.
 * @param prompt The initial user prompt to use as a title.
 */
async function saveCurrentChat(prompt: string) {
    const messages = getMessagesFromDOM();
    if (messages.length === 0) return;

    if (currentChatId) {
        // Update existing session
        const session = chatHistory.find(s => s.id === currentChatId);
        if (session) {
            session.messages = messages;
            session.updatedAt = new Date().toISOString();
        }
    } else {
        // Create new session
        currentChatId = `chat_${Date.now()}`;
        const title = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt;
        const now = new Date().toISOString();
        chatHistory.unshift({ 
          id: currentChatId, 
          title, 
          messages,
          createdAt: now,
          updatedAt: now
        });
    }
    
    saveHistoryToStorage();
    renderHistoryList();
}


// --- MESSAGE RENDERING & PARSING ---

/**
 * Securely escapes HTML.
 * @param html The HTML string to escape.
 * @returns The escaped HTML string.
 */
function escapeHTML(html: string): string {
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Parses markdown-like syntax to an HTML string, with security in mind.
 * @param text The raw text to parse.
 * @returns An HTML string.
 */
function parseMarkdown(text: string): string {
    const placeholders: string[] = [];
    let processedText = text;

    // 1. Isolate and process code blocks first.
    processedText = processedText.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
        const escapedCode = escapeHTML(code.trim());
        const placeholder = `<pre><code class="language-${lang || 'plaintext'} hljs">${escapedCode}</code></pre>`;
        placeholders.push(placeholder);
        return `__CODEBLOCK_${placeholders.length - 1}__`;
    });

    // 2. Escape the rest of the HTML to prevent XSS.
    processedText = escapeHTML(processedText);
    
    // 3. Process other markdown syntax on the escaped text.
    processedText = processedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // Links

    // 4. Restore the code blocks.
    processedText = processedText.replace(/__CODEBLOCK_(\d+)__/g, (_match, index) => {
        return placeholders[parseInt(index, 10)];
    });

    return processedText;
}

/**
 * Adds "Copy" buttons and applies syntax highlighting to code blocks.
 */
function processCodeBlocks(container: HTMLElement) {
    container.querySelectorAll('pre').forEach((pre) => {
        const code = pre.querySelector('code');
        if (!code) return;
        
        // Apply syntax highlighting
        hljs.highlightElement(code as HTMLElement);
        
        // Create code header
        const header = document.createElement('div');
        header.className = 'code-header';
        
        // Get language from class
        const languageMatch = code.className.match(/language-(\w+)/);
        const language = languageMatch ? languageMatch[1] : 'plaintext';
        
        const langSpan = document.createElement('span');
        langSpan.textContent = language;
        header.appendChild(langSpan);
        
        // Create copy button
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = ICONS.copy;
        button.setAttribute('aria-label', 'Copy code to clipboard');
        
        button.addEventListener('click', () => {
            const codeText = code.textContent;
            if (codeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    showToast('Copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
        
        header.appendChild(button);
        pre.insertBefore(header, code);
    });
}

/**
 * Appends a message to the chat container.
 * @param role The role of the message sender ('user' or 'model').
 * @param content The message content (string or HTMLElement).
 * @param options Additional options for rendering.
 * @returns The message content element.
 */
function appendMessage(
    role: 'user' | 'model', 
    content: string | HTMLElement, 
    options: { 
      isLastModelMessage?: boolean;
      timestamp?: string;
    } = {}
): HTMLElement {
    hideWelcomeScreen();
  
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);
    messageElement.dataset.role = role;

    const icon = document.createElement('div');
    icon.classList.add('message-icon');
    icon.textContent = role === 'user' ? 'U' : 'AJ';

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    
    // Add message header
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = role === 'user' ? 'You' : 'AJ STUDIOZ AI';
    
    const time = document.createElement('div');
    time.className = 'message-time';
    const timestamp = options.timestamp || new Date().toISOString();
    time.textContent = formatDate(new Date(timestamp));
    
    header.appendChild(sender);
    header.appendChild(time);
    contentWrapper.appendChild(header);

    if (typeof content === 'string') {
        const messageContent = document.createElement('div');
        messageContent.innerHTML = parseMarkdown(content);
        messageContent.dataset.rawText = content; // Store raw text
        contentWrapper.appendChild(messageContent);
    } else {
        contentWrapper.appendChild(content);
    }
  
    messageElement.appendChild(icon);
    messageElement.appendChild(contentWrapper);

    if (role === 'model') {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        if (options.isLastModelMessage) {
            const regenButton = document.createElement('button');
            regenButton.className = 'message-action-btn';
            regenButton.innerHTML = ICONS.regenerate;
            regenButton.title = 'Regenerate response';
            regenButton.onclick = handleRegenerate;
            actions.appendChild(regenButton);
        }
        messageElement.appendChild(actions);
    }
  
    chatContainer.appendChild(messageElement);
    processCodeBlocks(contentWrapper);
    scrollToBottom();
    return contentWrapper;
}


// --- WELCOME SCREEN & PROMPTS ---

/**
 * Shows the initial welcome screen with suggestion cards.
 */
function showWelcomeScreen() {
    chatContainer.innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-logo">AJ</div>
            <h1>How can I help you today?</h1>
            <p>I'm AJ STUDIOZ AI AGENT, your professional AI assistant. I can help with coding, writing, research, and more.</p>
            <div class="suggestion-cards">
                <div class="suggestion-card" data-prompt="Explain quantum computing in simple terms">
                    <h3>Explain a concept</h3>
                    <p>like quantum computing</p>
                </div>
                <div class="suggestion-card" data-prompt="Write a Python script to sort a list of dictionaries">
                    <h3>Write some code</h3>
                    <p>a Python script for sorting</p>
                </div>
                 <div class="suggestion-card" data-prompt="Brainstorm some creative names for a new coffee shop">
                    <h3>Brainstorm ideas</h3>
                    <p>for a new coffee shop</p>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = (card as HTMLElement).dataset.prompt;
            if (prompt) {
                chatInput.value = prompt;
                handleFormSubmit(new Event('submit'));
            }
        });
    });
}

/**
 * Hides the welcome screen if it's visible.
 */
function hideWelcomeScreen() {
    const welcomeScreen = chatContainer.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }
}

// --- CORE CHAT LOGIC ---

/**
 * Handles form submission to send a message.
 * @param e Form submission event.
 */
async function handleFormSubmit(e: Event) {
  e.preventDefault();
  if (isAwaitingResponse) return;

  const prompt = chatInput.value.trim();
  if (!prompt) return;

  isAwaitingResponse = true;
  setFormState(true);
  showTypingIndicator();

  appendMessage('user', prompt);
  
  const loadingIndicator = appendMessage('model', createLoadingIndicator());

  try {
    const result = await chat.sendMessageStream({ message: prompt });
    let fullResponse = '';

    for await (const chunk of result) {
        if (loadingIndicator.parentElement) { // Check if loading indicator is still there
            loadingIndicator.innerHTML = ''; // Clear it on first chunk
        }
        fullResponse += chunk.text;
        loadingIndicator.innerHTML = parseMarkdown(fullResponse);
        scrollToBottom();
    }
    
    loadingIndicator.dataset.rawText = fullResponse; // Store final raw text
    processCodeBlocks(loadingIndicator);
    addRegenerateButtonToLastMessage();
    await saveCurrentChat(prompt);

  } catch (error) {
    console.error(error);
    loadingIndicator.textContent = 'Oops! Something went wrong. Please try again.';
  } finally {
    isAwaitingResponse = false;
    setFormState(false);
    hideTypingIndicator();
  }
}

/**
 * Handles the "Regenerate" button click.
 */
async function handleRegenerate() {
    if (isAwaitingResponse) return;
    const messages = getMessagesFromDOM();
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();

    if (!lastUserMessage) return;

    // Remove the last model message from DOM
    const lastModelElement = chatContainer.querySelector('.model-message:last-of-type');
    if (lastModelElement) lastModelElement.remove();

    isAwaitingResponse = true;
    setFormState(true);
    showTypingIndicator();

    const prompt = lastUserMessage.parts[0].text;
    const loadingIndicator = appendMessage('model', createLoadingIndicator());

    try {
        const result = await chat.sendMessageStream({ message: prompt });
        let fullResponse = '';
        for await (const chunk of result) {
            if (loadingIndicator.parentElement) {
                loadingIndicator.innerHTML = '';
            }
            fullResponse += chunk.text;
            loadingIndicator.innerHTML = parseMarkdown(fullResponse);
            scrollToBottom();
        }
        loadingIndicator.dataset.rawText = fullResponse;
        processCodeBlocks(loadingIndicator);
        addRegenerateButtonToLastMessage();
        await saveCurrentChat(prompt);
    } catch (error) {
        console.error(error);
        loadingIndicator.textContent = 'Oops! Something went wrong on regenerate. Please try again.';
    } finally {
        isAwaitingResponse = false;
        setFormState(false);
        hideTypingIndicator();
    }
}


// --- UTILITY & HELPER FUNCTIONS ---

/**
 * Creates a loading indicator element.
 * @returns The loading indicator element.
 */
function createLoadingIndicator(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'loading-container';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'loading-indicator';
        container.appendChild(dot);
    }
    return container;
}

/**
 * Enables or disables the chat input form.
 * @param isLoading Whether the form should be in a loading state.
 */
function setFormState(isLoading: boolean) {
    chatInput.value = '';
    autoResizeTextarea();
    chatInput.disabled = isLoading;
    (chatForm.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = isLoading;
    if (!isLoading) chatInput.focus();
}

/**
 * Adjusts textarea height based on content.
 */
function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
}

/**
 * Gets all messages from the DOM.
 * @returns An array of Message objects.
 */
function getMessagesFromDOM(): Message[] {
    const messages: Message[] = [];
    chatContainer.querySelectorAll('.message').forEach(el => {
        const role = el.getAttribute('data-role') as 'user' | 'model';
        const contentEl = el.querySelector('.message-content > div:last-child') as HTMLElement;
        const text = contentEl?.dataset.rawText || contentEl?.textContent || '';
        const timestampEl = el.querySelector('.message-time');
        const timestamp = timestampEl?.getAttribute('data-timestamp') || new Date().toISOString();
        
        if (role && text) {
            messages.push({ 
              role, 
              parts: [{ text }], 
              timestamp 
            });
        }
    });
    return messages;
}

/**
 * Adds the regenerate button to the very last model message.
 */
function addRegenerateButtonToLastMessage() {
    // Remove existing regenerate buttons
    chatContainer.querySelectorAll('.message-actions').forEach(el => el.remove());

    const lastModelMessage = chatContainer.querySelector('.model-message:last-of-type');
    if (lastModelMessage) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        const regenButton = document.createElement('button');
        regenButton.className = 'message-action-btn';
        regenButton.innerHTML = ICONS.regenerate;
        regenButton.title = 'Regenerate response';
        regenButton.onclick = handleRegenerate;
        actions.appendChild(regenButton);
        lastModelMessage.appendChild(actions);
    }
}

/**
 * Handles keydown events on the textarea.
 * @param e The KeyboardEvent.
 */
function handleTextareaKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
}

/**
 * Handles clicks outside the context menu to close it.
 */
function handleDocumentClick(e: MouseEvent) {
  if (!contextMenu.contains(e.target as Node) && 
      !contextMenuTarget?.contains(e.target as Node)) {
    hideContextMenu();
  }
}


// --- INITIALIZATION ---

/**
 * Initializes the application.
 */
function initializeApp() {
    loadTheme();
    loadSettings();
    loadHistoryFromStorage();
    renderHistoryList();

    if (chatHistory.length > 0) {
        loadChatSession(chatHistory[0].id);
    } else {
        startNewChat();
    }
    
    // Event Listeners
    chatForm.addEventListener('submit', handleFormSubmit);
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleTextareaKeydown);
    newChatBtn.addEventListener('click', startNewChat);
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    themeToggleBtn.addEventListener('click', toggleTheme);
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    overlay.addEventListener('click', toggleMobileMenu);
    clearChatBtn.addEventListener('click', clearCurrentChat);
    exportChatBtn.addEventListener('click', exportChat);
    settingsBtn.addEventListener('click', toggleSettingsModal);
    closeSettingsBtn.addEventListener('click', toggleSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    searchHistoryInput.addEventListener('input', filterChatHistory);
    attachBtn.addEventListener('click', handleFileAttachment);
    fileInput.addEventListener('change', processAttachedFile);
    renameChatOption.addEventListener('click', renameChat);
    deleteChatOption.addEventListener('click', deleteChat);
    
    // Close context menu on document click
    document.addEventListener('click', handleDocumentClick);
    
    // Close modal on outside click
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        toggleSettingsModal();
      }
    });
}

initializeApp();
