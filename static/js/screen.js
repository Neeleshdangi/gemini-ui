// Screen.js - Handles screen sharing functionality and draggable screen window

let screenStream = null;
let screenDragTarget = null;
let screenDragStartX = 0;
let screenDragStartY = 0;
let screenDragOffsetX = 0;
let screenDragOffsetY = 0;

function initScreenInterface() {
    const screenToggleBtn = document.getElementById('screen-toggle');
    const screenVideo = document.getElementById('screen-video');
    const screenStatusText = document.getElementById('screen-status-text');
    const draggableScreen = document.getElementById('draggable-screen');
    const minimizeBtn = document.getElementById('minimize-screen');
    const maximizeBtn = document.getElementById('maximize-screen');
    const dragHeader = draggableScreen.querySelector('.draggable-header');
    
    // Set up screen toggle
    screenToggleBtn.addEventListener('click', toggleScreenSharing);
    
    // Set up draggable functionality
    dragHeader.addEventListener('mousedown', startScreenDrag);
    document.addEventListener('mousemove', dragScreen);
    document.addEventListener('mouseup', stopScreenDrag);
    
    // Touch support for mobile devices
    dragHeader.addEventListener('touchstart', handleScreenTouchStart, { passive: false });
    document.addEventListener('touchmove', handleScreenTouchMove, { passive: false });
    document.addEventListener('touchend', handleScreenTouchEnd);
    
    // Set up minimize/maximize controls
    minimizeBtn.addEventListener('click', () => {
        draggableScreen.classList.toggle('minimized');
        addLogEntry('info', 'Screen sharing window minimized');
    });
    
    maximizeBtn.addEventListener('click', () => {
        draggableScreen.classList.toggle('maximized');
        // Reset position when maximizing/restoring
        draggableScreen.style.transform = '';
        addLogEntry('info', draggableScreen.classList.contains('maximized') ? 
            'Screen sharing window maximized' : 'Screen sharing window restored');
    });
}

async function toggleScreenSharing() {
    const screenToggleBtn = document.getElementById('screen-toggle');
    const screenVideo = document.getElementById('screen-video');
    const screenStatusText = document.getElementById('screen-status-text');
    
    // If already active, stop screen sharing
    if (window.geminiState.screenActive) {
        stopScreenSharing();
        screenToggleBtn.classList.remove('active');
        screenStatusText.textContent = 'Screen sharing inactive';
        addLogEntry('info', 'Screen sharing stopped');
        window.geminiState.screenActive = false;
        return;
    }
    
    // Start screen sharing
    try {
        addLogEntry('info', 'Requesting screen sharing access...');
        
        // Check if getDisplayMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            throw new Error('Screen sharing not supported in this browser');
        }
        
        // Try to check permissions explicitly
        if (navigator.permissions && navigator.permissions.query) {
            try {
                // Note: 'display-capture' might not be supported in all browsers
                const permissionStatus = await navigator.permissions.query({ name: 'display-capture' });
                addLogEntry('info', `Screen capture permission status: ${permissionStatus.state}`);
                
                if (permissionStatus.state === 'denied') {
                    throw new Error('Screen capture permission denied');
                }
            } catch (permError) {
                // Some browsers might not support querying for this permission
                addLogEntry('warning', `Could not check screen capture permission: ${permError.message}`);
            }
        }
        
        // Request screen sharing with enhanced options
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
                cursor: 'always',
                displaySurface: 'monitor',
                logicalSurface: true,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { max: 30 }
            },
            audio: false
        });
        
        // Set video source
        screenVideo.srcObject = screenStream;
        
        // Handle user stopping the share via browser UI
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenSharing();
            screenToggleBtn.classList.remove('active');
            screenStatusText.textContent = 'Screen sharing inactive';
            addLogEntry('info', 'Screen sharing stopped by user');
            window.geminiState.screenActive = false;
        });
        
        // Update UI
        screenToggleBtn.classList.add('active');
        screenStatusText.textContent = 'Screen sharing active';
        addLogEntry('info', 'Screen sharing activated successfully');
        window.geminiState.screenActive = true;
        
        // Capture first frame after a short delay
        setTimeout(() => {
            const screenFrame = captureScreenFrame();
            if (screenFrame && window.geminiState.connected) {
                const messageData = { 
                    text: "Analyzing this screen capture",
                    imageData: screenFrame
                };
                sendToGemini(messageData);
                addLogEntry('info', 'Initial screen frame sent to Gemini API');
            }
        }, 1000);
        
    } catch (error) {
        addLogEntry('error', `Screen sharing error: ${error.message}`);
        screenToggleBtn.classList.remove('active');
        screenStatusText.textContent = 'Screen sharing failed';
        alert("Screen sharing access is required for this feature. Please grant permission in your browser settings and try again.");
    }
}

function stopScreenSharing() {
    // Stop screen stream
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        
        // Clear video source
        const screenVideo = document.getElementById('screen-video');
        screenVideo.srcObject = null;
    }
}

// Screen drag and drop functionality
function startScreenDrag(event) {
    // Don't start dragging if maximized
    const draggableScreen = document.getElementById('draggable-screen');
    if (draggableScreen.classList.contains('maximized')) {
        return;
    }
    
    // Set the drag target
    screenDragTarget = draggableScreen;
    
    // Get current position
    const style = window.getComputedStyle(screenDragTarget);
    const transform = style.transform;
    
    // Calculate current position based on transform
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        screenDragOffsetX = matrix.e;
        screenDragOffsetY = matrix.f;
    } else {
        screenDragOffsetX = 0;
        screenDragOffsetY = 0;
    }
    
    // Get starting mouse position
    if (event.type === 'mousedown') {
        screenDragStartX = event.clientX;
        screenDragStartY = event.clientY;
        event.preventDefault();
    }
}

function dragScreen(event) {
    if (!screenDragTarget) return;
    
    // Calculate new position
    let clientX, clientY;
    
    if (event.type === 'mousemove') {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    // Calculate position change
    const deltaX = clientX - screenDragStartX;
    const deltaY = clientY - screenDragStartY;
    
    // Update position
    const newX = screenDragOffsetX + deltaX;
    const newY = screenDragOffsetY + deltaY;
    
    // Apply new position using transform
    screenDragTarget.style.transform = `translate(${newX}px, ${newY}px)`;
    
    event.preventDefault();
}

function stopScreenDrag() {
    if (!screenDragTarget) return;
    
    // Update the offset to the final position
    const style = window.getComputedStyle(screenDragTarget);
    const transform = style.transform;
    
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        screenDragOffsetX = matrix.e;
        screenDragOffsetY = matrix.f;
    }
    
    // Clear drag target
    screenDragTarget = null;
}

// Touch event handlers for screen sharing
function handleScreenTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        screenDragStartX = touch.clientX;
        screenDragStartY = touch.clientY;
        startScreenDrag(event);
        event.preventDefault();
    }
}

function handleScreenTouchMove(event) {
    if (event.touches.length === 1 && screenDragTarget) {
        const touch = event.touches[0];
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            type: 'mousemove',
            preventDefault: () => event.preventDefault()
        };
        dragScreen(mouseEvent);
        event.preventDefault();
    }
}

function handleScreenTouchEnd(event) {
    stopScreenDrag();
}

function captureScreenFrame() {
    if (!window.geminiState.screenActive || !screenStream) {
        return null;
    }
    
    try {
        const screenVideo = document.getElementById('screen-video');
        
        // Create temporary canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        return frameBase64;
        
    } catch (error) {
        addLogEntry('error', `Error capturing screen frame: ${error.message}`);
        return null;
    }
}
