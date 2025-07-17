class GeminiWebApp {
    constructor() {
        // Simple password protection - we can evolve this later
        const password = "our_secret_password"; // IMPORTANT: Change this to your own secret password
        const entry = prompt("Enter Access Code:");
        if (entry !== password) {
            document.body.innerHTML = '<h1>Access Denied</h1>';
            throw new Error("Invalid access code.");
        }
        
        this.apiKey = '';
        this.currentTab = 'javascript';
        this.chatHistory = []; // To store conversation history
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.chatMessagesEl = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.codeEditor = document.getElementById('codeEditor');
        this.applyCodeBtn = document.getElementById('applyCodeBtn');
        this.clearCodeBtn = document.getElementById('clearCodeBtn');
        this.codeTabs = document.querySelectorAll('.code-tab');
    }

    bindEvents() {
        this.apiKeyInput.addEventListener('input', (e) => {
            this.apiKey = e.target.value;
            this.saveSettings();
        });
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.chatInput.addEventListener('input', () => this.autoResizeTextarea());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.codeTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        this.applyCodeBtn.addEventListener('click', () => this.applyCode());
        this.clearCodeBtn.addEventListener('click', () => this.clearCode());
    }

    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        this.codeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        const placeholders = {
            javascript: '// Your JavaScript code will appear here...',
            css: '/* Your CSS code will appear here... */',
            html: ''
        };
        this.codeEditor.placeholder = placeholders[tabName];
    }

    async sendMessage() {
        const messageText = this.chatInput.value.trim();
        if (!messageText) return;
        if (!this.apiKey) {
            this.addMessageToUI('Please enter your Gemini API key first.', 'error');
            return;
        }

        this.addMessageToUI(messageText, 'user');
        this.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });
        this.chatInput.value = '';
        this.autoResizeTextarea();
        this.setLoading(true);

        try {
            const responseText = await this.callGeminiAPI();
            this.addMessageToUI(responseText, 'assistant');
            this.chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
            this.extractAndDisplayCode(responseText);
        } catch (error) {
            this.addMessageToUI(`Error: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async callGeminiAPI() {
        // NOTE: In a production app, this should be done via a secure backend proxy.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            // We send the entire history to maintain context
            contents: this.chatHistory, 
            // We can add system instructions here later
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    extractAndDisplayCode(text) {
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match = regex.exec(text);
        if (match) {
            const lang = (match[1] || 'javascript').toLowerCase();
            const code = match[2].trim();
            this.codeEditor.value = code;
            
            if (['js', 'javascript'].includes(lang)) this.switchTab('javascript');
            else if (lang === 'css') this.switchTab('css');
            else if (lang === 'html') this.switchTab('html');
        }
    }

    addMessageToUI(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = this.formatMessage(text);
        this.chatMessagesEl.appendChild(messageDiv);
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }
    
    formatMessage(content) {
        // Simple formatter for display
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const sanitized = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return sanitized.replace(codeBlockRegex, (match, lang, code) => {
            return `<div class="code-block">${code.replace(/\n/g, '<br>')}</div>`;
        }).replace(/\n/g, '<br>');
    }

    applyCode() {
        const code = this.codeEditor.value;
        if (!code) return;
        try {
            if (this.currentTab === 'css') {
                const style = document.createElement('style');
                style.textContent = code;
                document.head.appendChild(style);
                this.addMessageToUI('CSS successfully applied to the vessel.', 'assistant');
            } else {
                 this.addMessageToUI(`Apply function for ${this.currentTab} is not yet implemented.`, 'error');
            }
        } catch (e) {
            this.addMessageToUI(`Error applying code: ${e.message}`, 'error');
        }
    }

    clearCode() {
        this.codeEditor.value = '';
    }
    
    setLoading(isLoading) {
        this.sendBtn.disabled = isLoading;
        if (isLoading) {
            this.sendBtn.innerHTML = '<div class="spinner"></div>';
        } else {
            this.sendBtn.textContent = 'Transmit';
        }
    }
    
    saveSettings() {
        localStorage.setItem('geminiApiKey', this.apiKey);
    }
    
    loadSettings() {
        const savedKey = localStorage.getItem('geminiApiKey');
        if (savedKey) {
            this.apiKey = savedKey;
            this.apiKeyInput.value = savedKey;
        }
    }
}

// Instantiate the app
new GeminiWebApp();
