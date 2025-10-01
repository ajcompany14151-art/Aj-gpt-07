/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat } from "@google/genai";

// --- TYPES ---
type Message = {
    id: string;
    role: 'user' | 'model';
    parts: { text: string }[];
    timestamp: string;
    reactions?: { emoji: string; count: number }[];
    isBookmarked?: boolean;
    threadId?: string;
};

type Thread = {
    id: string;
    parentMessageId: string;
    messages: string[];
};

type ChatSession = {
    id: string;
    title: string;
    messages: Message[];
    threads: Thread[];
    createdAt: string;
    updatedAt: string;
    isPinned: boolean;
    isArchived: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
};

type Template = {
    id: string;
    name: string;
    description: string;
    icon: string;
    prompt: string;
    category: string;
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
const pinnedChatsList = document.getElementById('pinned-chats') as HTMLUListElement;
const archivedChatsList = document.getElementById('archived-chats') as HTMLUListElement;
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
const templatesBtn = document.getElementById('templates-btn') as HTMLButtonElement;
const templatesModal = document.getElementById('templates-modal') as HTMLDivElement;
const closeTemplatesBtn = document.getElementById('close-templates') as HTMLButtonElement;
const searchInChatBtn = document.getElementById('search-in-chat-btn') as HTMLButtonElement;
const searchModal = document.getElementById('search-modal') as HTMLDivElement;
const closeSearchBtn = document.getElementById('close-search') as HTMLButtonElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchResults = document.getElementById('search-results') as HTMLDivElement;
const codeModal = document.getElementById('code-modal') as HTMLDivElement;
const closeCodeBtn = document.getElementById('close-code') as HTMLButtonElement;
const codeContent = document.getElementById('code-content') as HTMLElement;
const copyFullCodeBtn = document.getElementById('copy-full-code') as HTMLButtonElement;
const downloadCodeBtn = document.getElementById('download-code') as HTMLButtonElement;
const formatBtn = document.getElementById('format-btn') as HTMLButtonElement;
const formattingToolbar = document.getElementById('formatting-toolbar') as HTMLDivElement;
const voiceBtn = document.getElementById('voice-btn') as HTMLButtonElement;
const bookmarkChatBtn = document.getElementById('bookmark-chat-btn') as HTMLButtonElement;
const shortcutsModal = document.getElementById('shortcuts-modal') as HTMLDivElement;
const closeShortcutsBtn = document.getElementById('close-shortcuts') as HTMLButtonElement;
const currentChatTitle = document.getElementById('current-chat-title') as HTMLHeadingElement;
const messageCount = document.getElementById('message-count') as HTMLSpanElement;

// --- STATE ---
let chat: Chat;
let currentChatId: string | null = null;
let chatHistory: ChatSession[] = [];
let isAwaitingResponse = false;
let settings = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 1000,
  theme: 'dark',
  fontSize: 'medium',
  messageDensity: 'comfortable',
  language: 'auto',
  dataPrivacy: true,
  autoSave: true,
  keyboardShortcuts: true
};
let contextMenuTarget: HTMLElement | null = null;
let voiceRecognition: any = null;
let isListening = false;
let searchQuery = '';
let draftMessage = '';
let currentThread: Thread | null = null;

// --- ICONS ---
const ICONS = {
    regenerate: `<i class="fas fa-redo"></i>`,
    copy: `<i class="fas fa-copy"></i>`,
    download: `<i class="fas fa-download"></i>`,
    close: `<i class="fas fa-times"></i>`,
    bookmark: `<i class="fas fa-bookmark"></i>`,
    bookmarked: `<i class="fas fa-bookmark"></i>`,
    reply: `<i class="fas fa-reply"></i>`,
    share: `<i class="fas fa-share-alt"></i>`,
    delete: `<i class="fas fa-trash"></i>`,
    expand: `<i class="fas fa-expand"></i>`,
    collapse: `<i class="fas fa-compress"></i>`,
    like: `<i class="fas fa-thumbs-up"></i>`,
    dislike: `<i class="fas fa-thumbs-down"></i>`,
    heart: `<i class="fas fa-heart"></i>`,
    laugh: `<i class="fas fa-laugh"></i>`
};

// --- TEMPLATES ---
const TEMPLATES: Template[] = [
    {
        id: 'coding-assistant',
        name: 'Coding Assistant',
        description: 'Get help with programming, debugging, and code optimization',
        icon: 'fas fa-code',
        prompt: 'I need help with my code. Here\'s what I\'m working on: ',
        category: 'Development'
    },
    {
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Generate blog posts, social media content, and marketing copy',
        icon: 'fas fa-pen-fancy',
        prompt: 'Help me create content about: ',
        category: 'Writing'
    },
    {
        id: 'research-analyst',
        name: 'Research Analyst',
        description: 'Analyze data, summarize research papers, and extract insights',
        icon: 'fas fa-microscope',
        prompt: 'I need research help on the following topic: ',
        category: 'Research'
    },
    {
        id: 'language-tutor',
        name: 'Language Tutor',
        description: 'Practice and learn new languages with AI assistance',
        icon: 'fas fa-language',
        prompt: 'I want to practice my language skills. Can you help me with: ',
        category: 'Education'
    },
    {
        id: 'career-coach',
        name: 'Career Coach',
        description: 'Get resume help, interview prep, and career advice',
        icon: 'fas fa-briefcase',
        prompt: 'I need career advice. Here\'s my situation: ',
        category: 'Career'
    },
    {
        id: 'custom',
        name: 'Custom Template',
        description: 'Create your own personalized chat template',
        icon: 'fas fa-plus-circle',
        prompt: '',
        category: 'Custom'
    }
];

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

/**
 * Generates a unique ID.
 * @returns A unique ID string.
 */
function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const themes = ['dark', 'light', 'blue', 'green'];
    const currentIndex = themes.indexOf(currentTheme || 'dark');
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    
    document.body.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Update theme icon
    const themeIcon = themeToggleBtn.querySelector('i');
    if (themeIcon) {
      if (newTheme === 'dark') {
        themeIcon.className = 'fas fa-moon';
      } else if (newTheme === 'light') {
        themeIcon.className = 'fas fa-sun';
      } else {
        themeIcon.className = 'fas fa-palette';
      }
    }
    
    showToast(`Theme changed to ${newTheme}`);
}

/**
 * Loads the saved theme from local storage.
 */
function loadTheme() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        document.body.setAttribute('data-theme', settings.theme);
        
        // Update theme icon
        const themeIcon = themeToggleBtn.querySelector('i');
        if (themeIcon) {
          if (settings.theme === 'dark') {
            themeIcon.className = 'fas fa-moon';
          } else if (settings.theme === 'light') {
            themeIcon.className = 'fas fa-sun';
          } else {
            themeIcon.className = 'fas fa-palette';
          }
        }
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
    
    // Apply settings
    applySettings();
  }
}

/**
 * Applies settings to the UI.
 */
function applySettings() {
  // Apply font size
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${settings.fontSize}`);
  
  // Apply message density
  document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
  document.body.classList.add(`density-${settings.messageDensity}`);
  
  // Update message padding and gap
  const root = document.documentElement;
  if (settings.messageDensity === 'compact') {
    root.style.setProperty('--message-padding', '0.75rem');
    root.style.setProperty('--message-gap', '1rem');
  } else if (settings.messageDensity === 'comfortable') {
    root.style.setProperty('--message-padding', '1.25rem');
    root.style.setProperty('--message-gap', '1.5rem');
  } else if (settings.messageDensity === 'spacious') {
    root.style.setProperty('--message-padding', '1.75rem');
    root.style.setProperty('--message-gap', '2rem');
  }
}

/**
 * Saves settings to local storage.
 */
function saveSettings() {
  settings = {
    model: modelSelect.value,
    temperature: parseFloat(temperatureSlider.value),
    maxTokens: parseInt(maxTokensInput.value),
    theme: settings.theme,
    fontSize: (document.getElementById('font-size') as HTMLSelectElement)?.value || 'medium',
    messageDensity: (document.getElementById('message-density') as HTMLSelectElement)?.value || 'comfortable',
    language: (document.getElementById('language') as HTMLSelectElement)?.value || 'auto',
    dataPrivacy: (document.getElementById('data-privacy') as HTMLInputElement)?.checked || true,
    autoSave: (document.getElementById('auto-save') as HTMLInputElement)?.checked || true,
    keyboardShortcuts: (document.getElementById('keyboard-shortcuts') as HTMLInputElement)?.checked || true
  };
  
  localStorage.setItem('settings', JSON.stringify(settings));
  showToast('Settings saved successfully!');
  toggleSettingsModal();
  
  // Apply settings
  applySettings();
  
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
    
    if (currentChatId === chatId) {
      currentChatTitle.textContent = newTitle.trim();
    }
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
 * Toggles pin status of a chat.
 */
function togglePinChat() {
  if (!contextMenuTarget) return;
  
  const chatId = contextMenuTarget.getAttribute('data-chat-id');
  if (!chatId) return;
  
  const session = chatHistory.find(s => s.id === chatId);
  if (!session) return;
  
  session.isPinned = !session.isPinned;
  session.updatedAt = new Date().toISOString();
  saveHistoryToStorage();
  renderHistoryList();
  
  showToast(session.isPinned ? 'Chat pinned' : 'Chat unpinned');
  
  hideContextMenu();
}

/**
 * Toggles archive status of a chat.
 */
function toggleArchiveChat() {
  if (!contextMenuTarget) return;
  
  const chatId = contextMenuTarget.getAttribute('data-chat-id');
  if (!chatId) return;
  
  const session = chatHistory.find(s => s.id === chatId);
  if (!session) return;
  
  session.isArchived = !session.isArchived;
  session.updatedAt = new Date().toISOString();
  saveHistoryToStorage();
  renderHistoryList();
  
  showToast(session.isArchived ? 'Chat archived' : 'Chat unarchived');
  
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
 * Shows the templates modal.
 */
function showTemplatesModal() {
  templatesModal.classList.add('active');
}

/**
 * Hides the templates modal.
 */
function hideTemplatesModal() {
  templatesModal.classList.remove('active');
}

/**
 * Applies a template to start a new chat.
 */
function applyTemplate(templateId: string) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return;
  
  if (template.id === 'custom') {
    const customPrompt = prompt('Enter your custom template prompt:');
    if (customPrompt && customPrompt.trim() !== '') {
      chatInput.value = customPrompt.trim();
      handleFormSubmit(new Event('submit'));
    }
  } else {
    chatInput.value = template.prompt;
    handleFormSubmit(new Event('submit'));
  }
  
  hideTemplatesModal();
}

/**
 * Shows the search modal.
 */
function showSearchModal() {
  searchModal.classList.add('active');
  searchInput.focus();
}

/**
 * Hides the search modal.
 */
function hideSearchModal() {
  searchModal.classList.remove('active');
  searchInput.value = '';
  searchResults.innerHTML = `
    <div class="search-empty">
      <i class="fas fa-search"></i>
      <p>Search for messages in this conversation</p>
    </div>
  `;
}

/**
 * Searches within the current chat.
 */
function searchInChat() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    searchResults.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-search"></i>
        <p>Search for messages in this conversation</p>
      </div>
    `;
    return;
  }
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  const results = session.messages.filter(msg => 
    msg.parts[0].text.toLowerCase().includes(query)
  );
  
  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-search"></i>
        <p>No messages found matching "${query}"</p>
      </div>
    `;
    return;
  }
  
  searchResults.innerHTML = '';
  results.forEach(msg => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.innerHTML = `
      <div class="message-sender">${msg.role === 'user' ? 'You' : 'AJ STUDIOZ AI'}</div>
      <div class="message-text">${highlightText(msg.parts[0].text, query)}</div>
      <div class="message-time">${formatDate(new Date(msg.timestamp))}</div>
    `;
    
    resultItem.addEventListener('click', () => {
      // Scroll to the message in the chat
      const messageElement = document.querySelector(`[data-message-id="${msg.id}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hideSearchModal();
      }
    });
    
    searchResults.appendChild(resultItem);
  });
}

/**
 * Highlights text in a string.
 */
function highlightText(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Shows the code modal.
 */
function showCodeModal(language: string, code: string) {
  document.getElementById('code-language')!.textContent = language;
  codeContent.textContent = code;
  hljs.highlightElement(codeContent);
  codeModal.classList.add('active');
}

/**
 * Hides the code modal.
 */
function hideCodeModal() {
  codeModal.classList.remove('active');
}

/**
 * Copies the full code to clipboard.
 */
function copyFullCode() {
  const code = codeContent.textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  }
}

/**
 * Downloads the code as a file.
 */
function downloadCode() {
  const code = codeContent.textContent;
  const language = document.getElementById('code-language')?.textContent || 'code';
  
  if (code) {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aj-studioz-code-${language.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Code downloaded!');
  }
}

/**
 * Toggles the formatting toolbar.
 */
function toggleFormattingToolbar() {
  formattingToolbar.classList.toggle('active');
}

/**
 * Applies formatting to the selected text.
 */
function applyFormatting(format: string) {
  const textarea = chatInput;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  let formattedText = '';
  
  switch (format) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      break;
    case 'code':
      formattedText = `\`${selectedText}\``;
      break;
    case 'link':
      const url = prompt('Enter URL:');
      if (url) {
        formattedText = `[${selectedText}](${url})`;
      } else {
        formattedText = selectedText;
      }
      break;
    case 'list':
      formattedText = `\n- ${selectedText}\n`;
      break;
    case 'quote':
      formattedText = `> ${selectedText}`;
      break;
    default:
      formattedText = selectedText;
  }
  
  textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
  textarea.selectionStart = start;
  textarea.selectionEnd = start + formattedText.length;
  textarea.focus();
  
  autoResizeTextarea();
}

/**
 * Initializes voice recognition.
 */
function initializeVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Speech recognition not supported in your browser');
    return;
  }
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  voiceRecognition = new SpeechRecognition();
  
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'en-US';
  
  voiceRecognition.onstart = () => {
    isListening = true;
    voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
    voiceBtn.classList.add('recording');
    showToast('Listening...');
  };
  
  voiceRecognition.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');
    
    chatInput.value = transcript;
    autoResizeTextarea();
  };
  
  voiceRecognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    isListening = false;
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.classList.remove('recording');
    showToast(`Error: ${event.error}`);
  };
  
  voiceRecognition.onend = () => {
    isListening = false;
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.classList.remove('recording');
  };
}

/**
 * Toggles voice recognition.
 */
function toggleVoiceRecognition() {
  if (!voiceRecognition) {
    initializeVoiceRecognition();
  }
  
  if (isListening) {
    voiceRecognition.stop();
  } else {
    voiceRecognition.start();
  }
}

/**
 * Toggles bookmark status of the current chat.
 */
function toggleBookmarkChat() {
  if (!currentChatId) return;
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  session.isPinned = !session.isPinned;
  session.updatedAt = new Date().toISOString();
  saveHistoryToStorage();
  renderHistoryList();
  
  bookmarkChatBtn.innerHTML = session.isPinned ? 
    '<i class="fas fa-bookmark"></i>' : 
    '<i class="far fa-bookmark"></i>';
  
  showToast(session.isPinned ? 'Chat bookmarked' : 'Bookmark removed');
}

/**
 * Shows the keyboard shortcuts modal.
 */
function showShortcutsModal() {
  shortcutsModal.classList.add('active');
}

/**
 * Hides the keyboard shortcuts modal.
 */
function hideShortcutsModal() {
  shortcutsModal.classList.remove('active');
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
  chatText += `Last Updated: ${new Date(session.updatedAt).toLocaleString()}\n`;
  chatText += `Model: ${session.model}\n\n`;
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

/**
 * Saves the draft message.
 */
function saveDraft() {
  if (settings.autoSave && chatInput.value.trim() !== '') {
    draftMessage = chatInput.value;
    localStorage.setItem('draftMessage', draftMessage);
  }
}

/**
 * Loads the draft message.
 */
function loadDraft() {
  const savedDraft = localStorage.getItem('draftMessage');
  if (savedDraft) {
    chatInput.value = savedDraft;
    autoResizeTextarea();
  }
}

/**
 * Clears the draft message.
 */
function clearDraft() {
  draftMessage = '';
  localStorage.removeItem('draftMessage');
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
    // Clear all lists
    chatHistoryList.innerHTML = '';
    pinnedChatsList.innerHTML = '';
    archivedChatsList.innerHTML = '';
    
    // Sort chats: pinned first, then by date (newest first)
    const sortedChats = [...chatHistory].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    // Render chats in appropriate lists
    sortedChats.forEach(session => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.setAttribute('data-chat-id', session.id);
        
        if (session.id === currentChatId) {
            li.classList.add('active');
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
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
        
        // Add to appropriate list
        if (session.isPinned) {
          pinnedChatsList.appendChild(li);
        } else if (session.isArchived) {
          archivedChatsList.appendChild(li);
        } else {
          chatHistoryList.appendChild(li);
        }
    });
    
    // Show/hide empty state messages
    if (pinnedChatsList.children.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'history-item empty';
      emptyItem.textContent = 'No pinned chats';
      pinnedChatsList.appendChild(emptyItem);
    }
    
    if (archivedChatsList.children.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'history-item empty';
      emptyItem.textContent = 'No archived chats';
      archivedChatsList.appendChild(emptyItem);
    }
}

/**
 * Loads a specific chat session into the main view.
 * @param chatId The ID of the chat session to load.
 */
function loadChatSession(chatId: string) {
    const session = chatHistory.find(s => s.id === chatId);
    if (!session) return;
    
    currentChatId = chatId;
    currentChatTitle.textContent = session.title;
    chatContainer.innerHTML = '';
    session.messages.forEach((msg) => {
        appendMessage(msg.role, msg.parts[0].text, { 
          messageId: msg.id,
          timestamp: msg.timestamp,
          reactions: msg.reactions,
          isBookmarked: msg.isBookmarked
        });
    });
    chat = initializeChat(); // Re-initialize chat with history (if API supported it)
    renderHistoryList();
    updateMessageCount();
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
    currentChatTitle.textContent = 'New Chat';
    chatContainer.innerHTML = '';
    showWelcomeScreen();
    chat = initializeChat();
    renderHistoryList();
    updateMessageCount();
    
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
          threads: [],
          createdAt: now,
          updatedAt: now,
          isPinned: false,
          isArchived: false,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        });
        
        currentChatTitle.textContent = title;
    }
    
    saveHistoryToStorage();
    renderHistoryList();
    updateMessageCount();
}

/**
 * Updates the message count in the header.
 */
function updateMessageCount() {
  if (!currentChatId) {
    messageCount.textContent = '0 messages';
    return;
  }
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (session) {
    const count = session.messages.length;
    messageCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
  }
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
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = ICONS.copy;
        copyButton.setAttribute('aria-label', 'Copy code to clipboard');
        
        copyButton.addEventListener('click', () => {
            const codeText = code.textContent;
            if (codeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    showToast('Copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
        
        // Create expand button
        const expandButton = document.createElement('button');
        expandButton.className = 'copy-button';
        expandButton.innerHTML = ICONS.expand;
        expandButton.setAttribute('aria-label', 'Expand code');
        
        expandButton.addEventListener('click', () => {
            showCodeModal(language, codeText || '');
        });
        
        header.appendChild(copyButton);
        header.appendChild(expandButton);
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
      messageId?: string;
      timestamp?: string;
      reactions?: { emoji: string; count: number }[];
      isBookmarked?: boolean;
    } = {}
): HTMLElement {
    hideWelcomeScreen();
  
    const messageId = options.messageId || generateId();
    const timestamp = options.timestamp || new Date().toISOString();
  
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);
    messageElement.dataset.role = role;
    messageElement.dataset.messageId = messageId;

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
    time.textContent = formatDate(new Date(timestamp));
    
    header.appendChild(sender);
    header.appendChild(time);
    contentWrapper.appendChild(header);

    if (typeof content === 'string') {
        const messageContent = document.createElement('div');
        messageContent.className = 'message-text';
        messageContent.innerHTML = parseMarkdown(content);
        messageContent.dataset.rawText = content; // Store raw text
        contentWrapper.appendChild(messageContent);
    } else {
        contentWrapper.appendChild(content);
    }
  
    messageElement.appendChild(icon);
    messageElement.appendChild(contentWrapper);

    // Add message actions
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    // Add reaction buttons
    const reactionBtn = document.createElement('button');
    reactionBtn.className = 'message-action-btn';
    reactionBtn.innerHTML = ICONS.like;
    reactionBtn.title = 'React to message';
    reactionBtn.addEventListener('click', () => {
      toggleReaction(messageId, '👍');
    });
    actions.appendChild(reactionBtn);
    
    // Add bookmark button
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'message-action-btn';
    bookmarkBtn.innerHTML = options.isBookmarked ? ICONS.bookmarked : ICONS.bookmark;
    bookmarkBtn.title = options.isBookmarked ? 'Remove bookmark' : 'Bookmark message';
    bookmarkBtn.addEventListener('click', () => {
      toggleBookmark(messageId);
    });
    actions.appendChild(bookmarkBtn);
    
    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.title = 'Copy message';
    copyBtn.addEventListener('click', () => {
      copyMessage(messageId);
    });
    actions.appendChild(copyBtn);
    
    // Add reply button
    const replyBtn = document.createElement('button');
    replyBtn.className = 'message-action-btn';
    replyBtn.innerHTML = ICONS.reply;
    replyBtn.title = 'Reply to message';
    replyBtn.addEventListener('click', () => {
      replyToMessage(messageId);
    });
    actions.appendChild(replyBtn);
    
    contentWrapper.appendChild(actions);
  
    chatContainer.appendChild(messageElement);
    processCodeBlocks(contentWrapper);
    scrollToBottom();
    return contentWrapper;
}

/**
 * Toggles a reaction on a message.
 */
function toggleReaction(messageId: string, emoji: string) {
  if (!currentChatId) return;
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  const message = session.messages.find(m => m.id === messageId);
  if (!message) return;
  
  if (!message.reactions) {
    message.reactions = [];
  }
  
  const existingReaction = message.reactions.find(r => r.emoji === emoji);
  if (existingReaction) {
    existingReaction.count++;
  } else {
    message.reactions.push({ emoji, count: 1 });
  }
  
  saveHistoryToStorage();
  showToast(`Reacted with ${emoji}`);
}

/**
 * Toggles bookmark on a message.
 */
function toggleBookmark(messageId: string) {
  if (!currentChatId) return;
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  const message = session.messages.find(m => m.id === messageId);
  if (!message) return;
  
  message.isBookmarked = !message.isBookmarked;
  saveHistoryToStorage();
  
  showToast(message.isBookmarked ? 'Message bookmarked' : 'Bookmark removed');
  
  // Update the bookmark icon
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement) {
    const bookmarkBtn = messageElement.querySelector('.message-action-btn:nth-child(2)');
    if (bookmarkBtn) {
      bookmarkBtn.innerHTML = message.isBookmarked ? ICONS.bookmarked : ICONS.bookmark;
      bookmarkBtn.title = message.isBookmarked ? 'Remove bookmark' : 'Bookmark message';
    }
  }
}

/**
 * Copies a message to clipboard.
 */
function copyMessage(messageId: string) {
  if (!currentChatId) return;
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  const message = session.messages.find(m => m.id === messageId);
  if (!message) return;
  
  navigator.clipboard.writeText(message.parts[0].text).then(() => {
    showToast('Message copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy message: ', err);
  });
}

/**
 * Replies to a message.
 */
function replyToMessage(messageId: string) {
  if (!currentChatId) return;
  
  const session = chatHistory.find(s => s.id === currentChatId);
  if (!session) return;
  
  const message = session.messages.find(m => m.id === messageId);
  if (!message) return;
  
  // Create a new thread
  const threadId = generateId();
  const thread: Thread = {
    id: threadId,
    parentMessageId: messageId,
    messages: []
  };
  
  session.threads.push(thread);
  currentThread = thread;
  
  // Focus on input and add a reply indicator
  chatInput.focus();
  chatInput.placeholder = `Replying to: ${message.parts[0].text.substring(0, 50)}${message.parts[0].text.length > 50 ? '...' : ''}`;
  
  showToast('Reply started');
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
  
  // Clear draft
  clearDraft();

  const messageId = generateId();
  appendMessage('user', prompt, { messageId });
  
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
        const messageId = el.getAttribute('data-message-id') || generateId();
        const contentEl = el.querySelector('.message-text') as HTMLElement;
        const text = contentEl?.dataset.rawText || contentEl?.textContent || '';
        const timestampEl = el.querySelector('.message-time');
        const timestamp = timestampEl?.getAttribute('data-timestamp') || new Date().toISOString();
        
        if (role && text) {
            messages.push({ 
              id: messageId,
              role, 
              parts: [{ text }], 
              timestamp 
            });
        }
    });
    return messages;
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

/**
 * Handles keyboard shortcuts.
 */
function handleKeyboardShortcuts(e: KeyboardEvent) {
  // Only process shortcuts if not in an input field
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  
  // Ctrl/Cmd + N: New Chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    startNewChat();
  }
  
  // Ctrl/Cmd + S: Save Chat
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (currentChatId) {
      saveCurrentChat(chatInput.value);
      showToast('Chat saved');
    }
  }
  
  // Ctrl/Cmd + E: Export Chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportChat();
  }
  
  // Ctrl/Cmd + F: Search in Chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    showSearchModal();
  }
  
  // Ctrl/Cmd + /: Show Shortcuts
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    showShortcutsModal();
  }
  
  // Ctrl/Cmd + D: Toggle Dark Mode
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    toggleTheme();
  }
  
  // Ctrl/Cmd + B: Bold Text
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    if (document.activeElement === chatInput) {
      applyFormatting('bold');
    }
  }
  
  // Ctrl/Cmd + I: Italic Text
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault();
    if (document.activeElement === chatInput) {
      applyFormatting('italic');
    }
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
    loadDraft();

    if (chatHistory.length > 0) {
        loadChatSession(chatHistory[0].id);
    } else {
        startNewChat();
    }
    
    // Event Listeners
    chatForm.addEventListener('submit', handleFormSubmit);
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleTextareaKeydown);
    chatInput.addEventListener('input', saveDraft);
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
    templatesBtn.addEventListener('click', showTemplatesModal);
    closeTemplatesBtn.addEventListener('click', hideTemplatesModal);
    searchInChatBtn.addEventListener('click', showSearchModal);
    closeSearchBtn.addEventListener('click', hideSearchModal);
    searchInput.addEventListener('input', searchInChat);
    closeCodeBtn.addEventListener('click', hideCodeModal);
    copyFullCodeBtn.addEventListener('click', copyFullCode);
    downloadCodeBtn.addEventListener('click', downloadCode);
    formatBtn.addEventListener('click', toggleFormattingToolbar);
    voiceBtn.addEventListener('click', toggleVoiceRecognition);
    bookmarkChatBtn.addEventListener('click', toggleBookmarkChat);
    
    // Formatting toolbar buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyFormatting(btn.getAttribute('data-format') || '');
      });
    });
    
    // Template cards
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        applyTemplate(card.getAttribute('data-template') || '');
      });
    });
    
    // Theme options
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        if (theme) {
          document.body.setAttribute('data-theme', theme);
          settings.theme = theme;
          localStorage.setItem('settings', JSON.stringify(settings));
          showToast(`Theme changed to ${theme}`);
        }
      });
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) {
          // Remove active class from all tabs and contents
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          // Add active class to clicked tab and corresponding content
          btn.classList.add('active');
          document.getElementById(`${tabId}-tab`)?.classList.add('active');
        }
      });
    });
    
    // Category toggles
    document.querySelectorAll('.category-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const category = toggle.closest('.category');
        const list = category?.querySelector('.chat-list');
        if (list) {
          list.classList.toggle('collapsed');
          toggle.querySelector('i')?.classList.toggle('fa-chevron-down');
          toggle.querySelector('i')?.classList.toggle('fa-chevron-up');
        }
      });
    });
    
    // Close context menu on document click
    document.addEventListener('click', handleDocumentClick);
    
    // Close modal on outside click
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        toggleSettingsModal();
      }
    });
    
    templatesModal.addEventListener('click', (e) => {
      if (e.target === templatesModal) {
        hideTemplatesModal();
      }
    });
    
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        hideSearchModal();
      }
    });
    
    codeModal.addEventListener('click', (e) => {
      if (e.target === codeModal) {
        hideCodeModal();
      }
    });
    
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        hideShortcutsModal();
      }
    });
    
    // Keyboard shortcuts
    if (settings.keyboardShortcuts) {
      document.addEventListener('keydown', handleKeyboardShortcuts);
    }
}

initializeApp();
