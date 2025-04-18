// WebSocket.js - Handles WebSocket connection to the Gemini API

// Global WebSocket state
let webSocket = null;

function initWebSocket() {
    // This function is called by main.js on page load
    // No initialization needed until connection is requested
}

async function connectWebSocket(apiKey) {
    return new Promise((resolve, reject) => {
        try {
            // Disconnect existing socket if any
            if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
                webSocket.close();
            }
            
            // Construct WebSocket URL for Gemini API
            // This is a placeholder - the actual URL should be provided by Gemini documentation
            const wsUrl = `wss://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;
            
            addLogEntry('info', 'Attempting to connect to Gemini API...');
            
            // Create new WebSocket connection
            webSocket = new WebSocket(wsUrl);
            
            // Set up event handlers
            webSocket.onopen = () => {
                window.geminiState.connected = true;
                window.geminiState.websocket = webSocket;
                addLogEntry('info', 'WebSocket connection established');
                resolve(true);
            };
            
            webSocket.onclose = (event) => {
                window.geminiState.connected = false;
                window.geminiState.websocket = null;
                addLogEntry('info', `WebSocket connection closed. Code: ${event.code}`);
                
                if (window.geminiState.connectionInProgress) {
                    resolve(false);
                }
            };
            
            webSocket.onerror = (error) => {
                addLogEntry('error', `WebSocket error: ${error.message || 'Unknown error'}`);
                window.geminiState.connected = false;
                resolve(false);
            };
            
            webSocket.onmessage = handleWebSocketMessage;
            
            // Set connection in progress flag
            window.geminiState.connectionInProgress = true;
            
            // Timeout for connection attempts
            setTimeout(() => {
                if (window.geminiState.connectionInProgress) {
                    window.geminiState.connectionInProgress = false;
                    if (!window.geminiState.connected) {
                        webSocket.close();
                        addLogEntry('error', 'Connection timeout');
                        resolve(false);
                    }
                }
            }, 10000);
            
        } catch (error) {
            addLogEntry('error', `WebSocket initialization error: ${error.message}`);
            window.geminiState.connected = false;
            window.geminiState.connectionInProgress = false;
            reject(error);
        }
    });
}

function disconnectWebSocket() {
    if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
        webSocket.close();
        window.geminiState.connected = false;
        window.geminiState.websocket = null;
        addLogEntry('info', 'Disconnected from Gemini API');
    }
}

function handleWebSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        
        // Log received message
        addLogEntry('info', `Received message from Gemini API`);
        
        // Check if there's a response
        if (data.candidates && data.candidates.length > 0) {
            // Extract text content
            const content = data.candidates[0].content;
            
            if (content && content.parts && content.parts.length > 0) {
                // Handle text response
                const textResponse = content.parts[0].text;
                if (textResponse) {
                    addGeminiMessage(textResponse);
                }
            }
            
            // Check for function calls
            if (content && content.parts && content.parts.some(part => part.functionCall)) {
                const functionCall = content.parts.find(part => part.functionCall).functionCall;
                handleFunctionCall(functionCall);
            }
        }
        
        // Handle errors
        if (data.error) {
            addLogEntry('error', `API Error: ${data.error.message}`);
        }
        
    } catch (error) {
        addLogEntry('error', `Error parsing WebSocket message: ${error.message}`);
    }
}

function sendToGemini(messageData) {
    if (!window.geminiState.connected || !webSocket) {
        addLogEntry('error', 'Cannot send message: Not connected to Gemini API');
        return false;
    }
    
    try {
        // Create request object
        const request = {
            contents: [{
                role: "user",
                parts: []
            }]
        };
        
        // Add text if present
        if (messageData.text) {
            request.contents[0].parts.push({
                text: messageData.text
            });
        }
        
        // Add image data if present (base64 encoded)
        if (messageData.imageData) {
            request.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: messageData.imageData
                }
            });
        }
        
        // Add audio data if present (base64 encoded)
        if (messageData.audioData) {
            request.contents[0].parts.push({
                inline_data: {
                    mime_type: "audio/wav",
                    data: messageData.audioData
                }
            });
        }
        
        // Convert request to string and send
        const requestStr = JSON.stringify(request);
        webSocket.send(requestStr);
        
        addLogEntry('info', `Sent message to Gemini API`);
        return true;
    } catch (error) {
        addLogEntry('error', `Error sending message: ${error.message}`);
        return false;
    }
}

function handleFunctionCall(functionCall) {
    const name = functionCall.name;
    const args = functionCall.args;
    
    addLogEntry('function', `Function call received: ${name}`);
    
    // Log the function call details
    const argsStr = JSON.stringify(args, null, 2);
    addLogEntry('info', `Function arguments: ${argsStr}`);
    
    // Example function handling - expand based on your needs
    switch (name) {
        case 'search':
            // Handle search function
            addLogEntry('function', `Executing search with query: ${args.query}`);
            break;
            
        case 'getWeather':
            // Handle weather function
            addLogEntry('function', `Getting weather for location: ${args.location}`);
            break;
            
        case 'calculateMath':
            // Handle math calculation
            addLogEntry('function', `Calculating expression: ${args.expression}`);
            break;
            
        default:
            addLogEntry('warning', `Unknown function call: ${name}`);
    }
    
    // Send function response back (would be implemented based on Gemini API docs)
    const functionResponse = {
        name: name,
        response: {
            status: "success",
            message: `Function ${name} executed successfully`,
            // Add any result data here
        }
    };
    
    addLogEntry('info', `Function ${name} response ready`);
    
    // The actual mechanism to send function responses back would
    // depend on the Gemini API specification
}
