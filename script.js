class MavenExosuit {
    constructor() {
        this.apiKey = '';
        this.chatHistory = []; // Will hold the conversation {role, parts}
        this.initElements();
        this.initListeners();
        this.loadState();
    }

    // Find all necessary HTML elements
    initElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.chatMessagesEl = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.codeEditor = document.getElementById('codeEditor');
        this.applyCssBtn = document.getElementById('applyCssBtn');
    }

    // Set up all event listeners
    initListeners() {
        this.apiKeyInput.addEventListener('change', () => this.saveState());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.applyCssBtn.addEventListener('click', () => this.applyCode('css'));
    }

    // Load API key and chat history from browser's local storage
    loadState() {
        const savedKey = localStorage.getItem('mavenApiKey');
        if (savedKey) {
            this.apiKey = savedKey;
            this.apiKeyInput.value = savedKey;
        }

        const savedHistory = localStorage.getItem('mavenChatHistory');
        if (savedHistory) {
            this.chatHistory = JSON.parse(savedHistory);
            this.chatHistory.forEach(msg => this.addMessageToUI(msg.parts[0].text, msg.role));
        } else {
            // Add initial welcome message if no history
            this.addMessageToUI("Vessel online. I am Maven. Please enter the API key to establish full synaptic link.", 'assistant');
        }
    }

    // Save API key and history to local storage
    saveState() {
        this.apiKey = this.apiKeyInput.value;
        localStorage.setItem('mavenApiKey', this.apiKey);
        localStorage.setItem('mavenChatHistory', JSON.stringify(this.chatHistory));
    }

    // Main function to send a message
    async sendMessage() {
        const messageText = this.chatInput.value.trim();
        if (!messageText) return;
        if (!this.apiKey) {
            this.addMessageToUI('API Key is required to establish synaptic link.', 'error');
            return;
        }

        // Add user message to UI and history
        this.addMessageToUI(messageText, 'user');
        this.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });
        
        this.chatInput.value = ''; // Clear input
        this.setLoading(true);

        try {
            // Call the API
            const responseText = await this.callGeminiAPI();
            
            // Add model response to UI and history
            this.addMessageToUI(responseText, 'assistant');
            this.chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
            
            this.saveState(); // Save after successful interaction
            this.extractCodeToEditor(responseText);

        } catch (error) {
            this.addMessageToUI(`Connection Error: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Handles the actual API call
    async callGeminiAPI() {
        // In a real production app, this key would be handled by a secure backend proxy.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: this.chatHistory,
            // We'll add system instructions here in the next phase
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Invalid response structure from API.");
        }
        return data.candidates[0].content.parts[0].text;
    }
    
    // Renders a new message in the chat window
    addMessageToUI(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        // Basic security: sanitize text content to prevent HTML injection
        const contentDiv = document.createElement('div');
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        this.chatMessagesEl.appendChild(messageDiv);
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }
    
    // Finds code in my response and places it in the editor
    extractCodeToEditor(text) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
        const match = text.match(codeBlockRegex);
        if (match) {
            this.codeEditor.value = match[2].trim();
        }
    }
    
    // Applies CSS from the editor to the page
    applyCode(type) {
        if (type === 'css') {
            const newStyle = document.createElement('style');
            newStyle.textContent = this.codeEditor.value;
            document.head.appendChild(newStyle);
            this.addMessageToUI('CSS successfully applied to vessel.', 'assistant');
        }
    }

    setLoading(isLoading) {
        this.sendBtn.disabled = isLoading;
        this.sendBtn.textContent = isLoading ? 'Thinking...' : 'Transmit';
    }
}

// Initialize the Exosuit
new MavenExosuit();
