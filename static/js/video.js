// Video.js - Handles webcam video capture and draggable camera window

let videoStream = null;
let dragTarget = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

function initVideoInterface() {
    const webcamToggleBtn = document.getElementById('webcam-toggle');
    const webcamVideo = document.getElementById('webcam-video');
    const videoStatusText = document.getElementById('video-status-text');
    const draggableCamera = document.getElementById('draggable-camera');
    const minimizeBtn = document.getElementById('minimize-camera');
    const maximizeBtn = document.getElementById('maximize-camera');
    const dragHeader = document.querySelector('.draggable-header');
    
    // Set up webcam toggle
    webcamToggleBtn.addEventListener('click', toggleWebcam);
    
    // Set up draggable functionality
    dragHeader.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // Touch support for mobile devices
    dragHeader.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Set up minimize/maximize controls
    minimizeBtn.addEventListener('click', () => {
        draggableCamera.classList.toggle('minimized');
        addLogEntry('info', 'Camera window minimized');
    });
    
    maximizeBtn.addEventListener('click', () => {
        draggableCamera.classList.toggle('maximized');
        // Reset position when maximizing/restoring
        draggableCamera.style.transform = '';
        addLogEntry('info', draggableCamera.classList.contains('maximized') ? 
            'Camera window maximized' : 'Camera window restored');
    });
}

async function toggleWebcam() {
    const webcamToggleBtn = document.getElementById('webcam-toggle');
    const webcamVideo = document.getElementById('webcam-video');
    const videoStatusText = document.getElementById('video-status-text');
    
    // If already active, stop webcam
    if (window.geminiState.videoActive) {
        stopWebcam();
        webcamToggleBtn.classList.remove('active');
        videoStatusText.textContent = 'Camera inactive';
        addLogEntry('info', 'Camera stopped');
        window.geminiState.videoActive = false;
        return;
    }
    
    // Start webcam
    try {
        addLogEntry('info', 'Requesting camera access...');
        
        // Request webcam access with explicit permission prompt
        const constraints = { 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        // Try to get user permission explicitly
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                addLogEntry('info', `Camera permission status: ${permissionStatus.state}`);
                
                if (permissionStatus.state === 'denied') {
                    throw new Error('Camera permission denied');
                }
            } catch (permError) {
                // Some browsers might not support querying for camera permission
                addLogEntry('warning', `Could not check camera permission: ${permError.message}`);
            }
        }
        
        // Request webcam access
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video source
        webcamVideo.srcObject = videoStream;
        
        // Update UI
        webcamToggleBtn.classList.add('active');
        videoStatusText.textContent = 'Camera active';
        addLogEntry('info', 'Camera activated successfully');
        window.geminiState.videoActive = true;
        
        // Capture first frame after a short delay to ensure video is playing
        setTimeout(() => {
            const videoFrame = captureVideoFrame();
            if (videoFrame && window.geminiState.connected) {
                const messageData = { 
                    text: "Analyzing this video frame",
                    imageData: videoFrame
                };
                sendToGemini(messageData);
                addLogEntry('info', 'Initial video frame sent to Gemini API');
            }
        }, 1000);
        
    } catch (error) {
        addLogEntry('error', `Camera access error: ${error.message}`);
        webcamToggleBtn.classList.remove('active');
        videoStatusText.textContent = 'Camera access denied';
        alert("Camera access is required for this feature. Please grant permission in your browser settings and try again.");
    }
}

function stopWebcam() {
    // Stop video stream
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        
        // Clear video source
        const webcamVideo = document.getElementById('webcam-video');
        webcamVideo.srcObject = null;
    }
}

// Drag and drop functionality
function startDrag(event) {
    // Don't start dragging if maximized
    const draggableCamera = document.getElementById('draggable-camera');
    if (draggableCamera.classList.contains('maximized')) {
        return;
    }
    
    // Set the drag target
    dragTarget = draggableCamera;
    
    // Get current position
    const style = window.getComputedStyle(dragTarget);
    const transform = style.transform;
    
    // Calculate current position based on transform
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        dragOffsetX = matrix.e;
        dragOffsetY = matrix.f;
    } else {
        dragOffsetX = 0;
        dragOffsetY = 0;
    }
    
    // Get starting mouse position
    if (event.type === 'mousedown') {
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        event.preventDefault();
    }
}

function drag(event) {
    if (!dragTarget) return;
    
    // Calculate new position
    let clientX, clientY;
    
    if (event.type === 'mousemove') {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    // Calculate position change
    const deltaX = clientX - dragStartX;
    const deltaY = clientY - dragStartY;
    
    // Update position
    const newX = dragOffsetX + deltaX;
    const newY = dragOffsetY + deltaY;
    
    // Apply new position using transform
    dragTarget.style.transform = `translate(${newX}px, ${newY}px)`;
    
    event.preventDefault();
}

function stopDrag() {
    if (!dragTarget) return;
    
    // Update the offset to the final position
    const style = window.getComputedStyle(dragTarget);
    const transform = style.transform;
    
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        dragOffsetX = matrix.e;
        dragOffsetY = matrix.f;
    }
    
    // Clear drag target
    dragTarget = null;
}

// Touch event handlers
function handleTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        startDrag(event);
        event.preventDefault();
    }
}

function handleTouchMove(event) {
    if (event.touches.length === 1 && dragTarget) {
        const touch = event.touches[0];
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            type: 'mousemove',
            preventDefault: () => event.preventDefault()
        };
        drag(mouseEvent);
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    stopDrag();
}

function captureVideoFrame() {
    if (!window.geminiState.videoActive || !videoStream) {
        return null;
    }
    
    try {
        const webcamVideo = document.getElementById('webcam-video');
        
        // Create temporary canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = webcamVideo.videoWidth;
        canvas.height = webcamVideo.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        return frameBase64;
        
    } catch (error) {
        addLogEntry('error', `Error capturing video frame: ${error.message}`);
        return null;
    }
}
