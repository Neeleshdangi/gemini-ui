// Audio.js - Handles audio recording and visualization

let audioContext = null;
let audioStream = null;
let audioSource = null;
let analyser = null;
let audioRecorder = null;
let isRecording = false;
let audioVisualizerInterval = null;

function initAudioInterface() {
    const micToggleBtn = document.getElementById('mic-toggle');
    const audioVisualizer = document.getElementById('audio-visualizer');
    const audioStatusText = document.getElementById('audio-status-text');
    
    // Initialize audio context
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        addLogEntry('info', 'Audio context initialized');
    } catch (error) {
        addLogEntry('error', `Could not initialize audio context: ${error.message}`);
    }
    
    // Set up microphone toggle
    micToggleBtn.addEventListener('click', toggleMicrophone);
}

async function toggleMicrophone() {
    const micToggleBtn = document.getElementById('mic-toggle');
    const audioStatusText = document.getElementById('audio-status-text');
    
    // If already recording, stop recording
    if (isRecording) {
        stopAudioRecording();
        micToggleBtn.classList.remove('active');
        audioStatusText.textContent = 'Microphone inactive';
        stopAudioVisualizer();
        addLogEntry('info', 'Microphone stopped');
        window.geminiState.audioActive = false;
        return;
    }
    
    // Start recording
    try {
        addLogEntry('info', 'Requesting microphone access...');
        
        // Check for microphone permission if the API is available
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                addLogEntry('info', `Microphone permission status: ${permissionStatus.state}`);
                
                if (permissionStatus.state === 'denied') {
                    throw new Error('Microphone permission denied');
                }
            } catch (permError) {
                // Some browsers might not support querying for microphone permission
                addLogEntry('warning', `Could not check microphone permission: ${permError.message}`);
            }
        }
        
        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        // Resume audio context if it was suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Initialize audio processing
        audioSource = audioContext.createMediaStreamSource(audioStream);
        audioSource.connect(analyser);
        
        // Create recorder
        audioRecorder = new MediaRecorder(audioStream);
        
        // Set up recorder events
        const audioChunks = [];
        
        audioRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        audioRecorder.onstop = async () => {
            // Create blob from recorded chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            
            // Convert to base64 for sending to API
            const audioBase64 = await blobToBase64(audioBlob);
            
            // Send to Gemini API if connected
            if (window.geminiState.connected) {
                const messageData = { 
                    text: "Processing this audio input",
                    audioData: audioBase64.split(',')[1] // Remove the data URL prefix
                };
                
                sendToGemini(messageData);
                addLogEntry('info', 'Audio sent to Gemini API');
            }
        };
        
        // Start recording
        audioRecorder.start();
        isRecording = true;
        
        // Update UI
        micToggleBtn.classList.add('active');
        audioStatusText.textContent = 'Microphone active';
        startAudioVisualizer();
        addLogEntry('info', 'Microphone activated successfully');
        window.geminiState.audioActive = true;
        
    } catch (error) {
        addLogEntry('error', `Microphone access error: ${error.message}`);
        isRecording = false;
        micToggleBtn.classList.remove('active');
        audioStatusText.textContent = 'Microphone access denied';
        alert("Microphone access is required for this feature. Please grant permission in your browser settings and try again.");
    }
}

function stopAudioRecording() {
    // Stop recording
    if (audioRecorder && isRecording) {
        audioRecorder.stop();
        isRecording = false;
    }
    
    // Stop microphone stream
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    
    // Disconnect audio source
    if (audioSource) {
        audioSource.disconnect();
        audioSource = null;
    }
}

function startAudioVisualizer() {
    const audioVisualizer = document.getElementById('audio-visualizer');
    const canvasCtx = audioVisualizer.getContext('2d');
    
    // Set canvas dimensions
    audioVisualizer.width = audioVisualizer.clientWidth;
    audioVisualizer.height = audioVisualizer.clientHeight;
    
    // Create data array for frequency data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    
    // Start visualization loop
    audioVisualizerInterval = setInterval(() => {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Clear canvas
        canvasCtx.fillStyle = '#f1f3f4';
        canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);
        
        // Calculate bar width based on canvas size and buffer length
        const barWidth = audioVisualizer.width / bufferLength * 2.5;
        let x = 0;
        
        // Draw bars for each frequency
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 255 * audioVisualizer.height;
            
            // Use a gradient color based on frequency
            const hue = i / bufferLength * 360;
            canvasCtx.fillStyle = `hsl(${hue}, 70%, 60%)`;
            
            // Draw bar
            canvasCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }, 50);
}

function stopAudioVisualizer() {
    if (audioVisualizerInterval) {
        clearInterval(audioVisualizerInterval);
        audioVisualizerInterval = null;
        
        // Clear canvas
        const audioVisualizer = document.getElementById('audio-visualizer');
        const canvasCtx = audioVisualizer.getContext('2d');
        canvasCtx.fillStyle = '#f1f3f4';
        canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    }
}

// Helper function to convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
