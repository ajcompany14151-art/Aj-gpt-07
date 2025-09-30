/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat } from "@google/genai";

// --- TYPES ---
type Message = {
    role: 'user' | 'model';
    parts: { text: string }[];
};
type ChatSession = {
    id: string;
    title: string;
    messages: Message[];
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

// --- STATE ---
let chat: Chat;
let currentChatId: string | null = null;
let chatHistory: ChatSession[] = [];
let isAwaitingResponse = false;

// --- ICONS ---
const ICONS = {
    regenerate: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 L 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.34 2.6l-1.69 1.69"/><path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.34-2.6l1.69-1.69"/><path d="M3 7v6h6"/><path d="M21 17v-6h-6"/></svg>`
};

// --- CORE FUNCTIONS ---

/**
 * Initializes the Generative AI model and chat session.
 */
function initializeChat(): Chat {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are AJ STUDIOZ AI AGENT, a professional, helpful, and friendly AI assistant designed by AJ STUDIOZ. Provide clear, accurate, and well-structured responses. When providing code, always use markdown code blocks with the appropriate language identifier.',
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
}

/**
 * Loads the saved theme from local storage.
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
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
        li.textContent = session.title;
        li.dataset.chatId = session.id;
        if (session.id === currentChatId) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => loadChatSession(session.id));
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
        appendMessage(msg.role, msg.parts[0].text, { isLastModelMessage });
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
        }
    } else {
        // Create new session
        currentChatId = `chat_${Date.now()}`;
        const title = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt;
        chatHistory.unshift({ id: currentChatId, title, messages });
    }
    
    saveHistoryToStorage();
    renderHistoryList();
}


// --- MESSAGE RENDERING & PARSING ---

/**
 * Parses markdown-like syntax to an HTML string, with security in mind.
 */
function parseMarkdown(text: string): string {
    // First, escape HTML characters to prevent XSS attacks from raw HTML in the input.
    const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Process markdown syntax on the escaped text.
    return escapedText
        // Handle code blocks first, as they are multi-line and can contain other symbols.
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
            // The `code` variable is captured from `escapedText`, so its HTML is already escaped.
            // We just need to trim it. We don't re-escape, as that would double-escape characters.
            const trimmedCode = code.trim();
            // The `hljs` class is a hint for highlight.js to apply styles.
            // The content is safe for innerHTML because it's been escaped. `highlightElement`
            // will later read this content as text, highlight it, and replace it with safe HTML.
            return `<pre><code class="language-${lang || 'plaintext'} hljs">${trimmedCode}</code></pre>`;
        })
        // Handle bold text: **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle italic text: *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle inline code: `code`. This is safe because $1 comes from the already-escaped `escapedText`.
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}


/**
 * Adds "Copy" buttons and applies syntax highlighting to code blocks.
 */
function processCodeBlocks(container: HTMLElement) {
    container.querySelectorAll('pre code').forEach((block) => {
        // Apply syntax highlighting
        hljs.highlightElement(block as HTMLElement);
        
        const pre = block.parentElement;
        if (!pre || pre.querySelector('.copy-button')) return;

        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        
        button.addEventListener('click', () => {
            const code = block.textContent;
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    showToast('Copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
        
        pre.appendChild(button);
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
    options: { isLastModelMessage?: boolean } = {}
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

    if (typeof content === 'string') {
        contentWrapper.innerHTML = parseMarkdown(content);
        contentWrapper.dataset.rawText = content; // Store raw text
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
    (chatForm.querySelector('button') as HTMLButtonElement).disabled = isLoading;
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
        const contentEl = el.querySelector('.message-content') as HTMLElement;
        const text = contentEl?.dataset.rawText || contentEl?.textContent || '';
        if (role && text) {
            messages.push({ role, parts: [{ text }] });
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


// --- INITIALIZATION ---

/**
 * Initializes the application.
 */
function initializeApp() {
    loadTheme();
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
}

initializeApp();