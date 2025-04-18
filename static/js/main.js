// Main.js - Entry point and control initialization

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI components
    const apiKeyInput = document.getElementById('api-key-input');
    const connectBtn = document.getElementById('connect-btn');
    const connectionStatus = document.getElementById('connection-status');
    const controlButtons = document.querySelectorAll('.control-btn');
    const panels = document.querySelectorAll('.panel');
    const clearLogsBtn = document.getElementById('clear-logs');
    const logsContainer = document.getElementById('logs-container');

    // Global state object
    window.geminiState = {
        connected: false,
        connectionInProgress: false,
        activeMode: 'text',
        audioActive: false,
        videoActive: false,
        screenActive: false,
        apiKey: '',
        websocket: null
    };

    // Initialize modules
    initWebSocket();
    initChatInterface();
    initAudioInterface();
    initVideoInterface();
    initScreenInterface();

    // Connect to Gemini API
    connectBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            addLogEntry('error', 'API Key is required');
            return;
        }

        if (window.geminiState.connected) {
            // Disconnect if already connected
            disconnectWebSocket();
            connectBtn.textContent = 'Connect';
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.className = 'status disconnected';
            return;
        }

        // Connect to WebSocket
        window.geminiState.apiKey = apiKey;
        connectionStatus.textContent = 'Connecting...';
        connectionStatus.className = 'status connecting';
        connectBtn.disabled = true;

        try {
            const connected = await connectWebSocket(apiKey);
            if (connected) {
                connectionStatus.textContent = 'Connected';
                connectionStatus.className = 'status connected';
                connectBtn.textContent = 'Disconnect';
                addLogEntry('info', 'Connected to Gemini API');
            } else {
                connectionStatus.textContent = 'Connection Failed';
                connectionStatus.className = 'status disconnected';
                addLogEntry('error', 'Failed to connect to Gemini API');
            }
        } catch (error) {
            connectionStatus.textContent = 'Connection Error';
            connectionStatus.className = 'status disconnected';
            addLogEntry('error', `Connection error: ${error.message}`);
        } finally {
            connectBtn.disabled = false;
        }
    });

    // Mode switching
    controlButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.id.split('-')[0];
            
            // Update active button
            controlButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding panel, hide others
            panels.forEach(panel => {
                if (panel.id === `${mode}-container`) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
            
            // Update active mode
            window.geminiState.activeMode = mode;
            addLogEntry('info', `Switched to ${mode} mode`);
        });
    });

    // Clear logs
    clearLogsBtn.addEventListener('click', () => {
        logsContainer.innerHTML = '';
        addLogEntry('info', 'Logs cleared');
    });

    // Add initial log entry
    addLogEntry('info', 'Gemini 2.0 Flash Live interface initialized');
});

// Utility function to add log entries
function addLogEntry(type, message) {
    const logsContainer = document.getElementById('logs-container');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    logEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-type log-${type}">${type.toUpperCase()}</span>
        <span class="log-message">${message}</span>
    `;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Global error handler
window.addEventListener('error', (event) => {
    addLogEntry('error', `JavaScript error: ${event.message}`);
});
