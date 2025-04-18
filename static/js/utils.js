// Utils.js - Utility functions for various components

// Format timestamp for logging
function formatTimestamp(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Debounce function to limit frequency of function calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Throttle function to limit frequency of function calls but call immediately
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Safe JSON parsing with error handling
function safeJsonParse(str, fallback = {}) {
    try {
        return JSON.parse(str);
    } catch (e) {
        addLogEntry('error', `JSON parsing error: ${e.message}`);
        return fallback;
    }
}

// Convert data URL to Blob
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

// Calculate audio levels from analyzer
function getAudioLevel(analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    
    return sum / bufferLength / 255; // Normalize to 0-1
}

// Copy text to clipboard
function copyToClipboard(text) {
    if (!navigator.clipboard) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                addLogEntry('info', 'Text copied to clipboard');
            } else {
                addLogEntry('error', 'Failed to copy text');
            }
        } catch (err) {
            addLogEntry('error', `Copy error: ${err.message}`);
        }
        
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => addLogEntry('info', 'Text copied to clipboard'))
        .catch(err => addLogEntry('error', `Clipboard error: ${err.message}`));
}

// Detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Safely access nested properties
function getNestedProperty(obj, path, defaultValue = undefined) {
    if (!path) return obj;
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length; i++) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[keys[i]];
    }
    
    return current === undefined ? defaultValue : current;
}

// Generate a unique ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
