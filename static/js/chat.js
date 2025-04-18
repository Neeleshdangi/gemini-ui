// Chat.js - Handles the chat interface

let messageHistory = [];

function initChatInterface() {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Send message on button click
    sendBtn.addEventListener('click', () => {
        sendUserMessage();
    });
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendUserMessage();
        }
    });
}

function sendUserMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    if (!window.geminiState.connected) {
        addLogEntry('error', 'Cannot send message: Not connected to Gemini API');
        return;
    }
    
    // Add to UI
    addUserMessage(message);
    
    // Clear input field
    userInput.value = '';
    
    // Send to Gemini API
    const messageData = { text: message };
    
    // If in video mode and video is active, capture and send video frame
    if (window.geminiState.activeMode === 'video' && window.geminiState.videoActive) {
        const videoFrame = captureVideoFrame();
        if (videoFrame) {
            messageData.imageData = videoFrame;
        }
    }
    
    // If in screen mode and screen sharing is active, capture and send screen frame
    if (window.geminiState.activeMode === 'screen' && window.geminiState.screenActive) {
        const screenFrame = captureScreenFrame();
        if (screenFrame) {
            messageData.imageData = screenFrame;
        }
    }
    
    // Send message to Gemini API
    sendToGemini(messageData);
}

function addUserMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    
    // Add to history
    messageHistory.push({
        role: 'user',
        content: message
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addGeminiMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message gemini-message';
    
    // Convert markdown-like formatting to HTML
    const formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/`(.*?)`/g, '<code>$1</code>')            // Code
        .replace(/\n/g, '<br/>');                          // Line breaks
    
    messageElement.innerHTML = formattedMessage;
    chatMessages.appendChild(messageElement);
    
    // Add to history
    messageHistory.push({
        role: 'gemini',
        content: message
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    messageHistory = [];
    addLogEntry('info', 'Chat history cleared');
}
