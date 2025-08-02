// Create and add overlay to block all interactions
function createOverlay() {
  // Check if overlay already exists
  if (document.getElementById('clickloom-overlay')) {
    return;
  }
  
  try {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'clickloom-overlay';
    
    // Create message element
    const message = document.createElement('div');
    message.id = 'clickloom-overlay-message';
    message.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 10px;">ClickLoom is scanning this link...</div>
      <div style="margin: 15px 0;">
        <div class="spinner" style="
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 4px solid white;
          width: 30px;
          height: 30px;
          margin: 0 auto;
          animation: spin 1s linear infinite;
        "></div>
      </div>
      <div style="font-size: 14px; color: #ccc;">Please wait while we check for security threats</div>
    `;
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    // Prevent all interactions
    overlay.addEventListener('click', e => e.stopPropagation());
    overlay.addEventListener('mousedown', e => e.stopPropagation());
    overlay.addEventListener('mouseup', e => e.stopPropagation());
    overlay.addEventListener('keydown', e => e.stopPropagation());
    overlay.addEventListener('keyup', e => e.stopPropagation());
    overlay.addEventListener('keypress', e => e.stopPropagation());
    
    return overlay;
  } catch (error) {
    console.error('Error creating overlay:', error);
    return null;
  }
}

// Remove overlay
function removeOverlay() {
  try {
    const overlay = document.getElementById('clickloom-overlay');
    if (overlay) {
      overlay.remove();
    }
  } catch (error) {
    console.error('Error removing overlay:', error);
  }
}

// Content script now focuses on UI management only
// All navigation is blocked by declarativeNetRequest
let isNavigationBlocked = false;

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'cancelNavigation') {
      removeOverlay();
      isNavigationBlocked = false;
    } else if (message.type === 'showOverlay') {
      createOverlay();
      isNavigationBlocked = true;
    } else if (message.type === 'hideOverlay') {
      removeOverlay();
      isNavigationBlocked = false;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});