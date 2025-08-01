// Debug logging function
function debugLog(message, data) {
  console.log(`[ClickLoom Content] ${message}`, data || '');
}

// Initialize with debug info
debugLog('Content script loaded');

// Create and add overlay to block all interactions
function createOverlay() {
  debugLog('Creating overlay');
  
  // Check if overlay already exists
  if (document.getElementById('clickloom-overlay')) {
    debugLog('Overlay already exists');
    return;
  }
  
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
  
  debugLog('Overlay created and added to page');
  return overlay;
}

// Remove overlay
function removeOverlay() {
  debugLog('Removing overlay');
  const overlay = document.getElementById('clickloom-overlay');
  if (overlay) {
    overlay.remove();
    debugLog('Overlay removed');
  }
}

// Function to handle link clicks
function handleLinkClick(event) {
  // Find the closest anchor tag to the clicked element
  const link = event.target.closest('a');
  
  // If no link was found or it has no href, let the click through
  if (!link || !link.href) {
    return;
  }

  debugLog('Link clicked', link.href);

  // Only handle left clicks without modifier keys
  if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) {
    debugLog('Ignoring modified click (ctrl/shift/etc)');
    return;
  }

  // Skip certain protocols that don't need scanning
  const url = new URL(link.href);
  if (url.protocol === 'mailto:' || url.protocol === 'tel:' || url.protocol === 'javascript:') {
    debugLog('Ignoring special protocol', url.protocol);
    return;
  }

  // Prevent the default navigation
  event.preventDefault();
  event.stopPropagation();
  debugLog('Default navigation prevented');
  
  // Create overlay to block all interactions
  createOverlay();

  // Store the URL in chrome.storage.local
  chrome.storage.local.set({ 'clickedUrl': link.href }, () => {
    debugLog('URL stored in chrome.storage.local', link.href);
    
    // Send message to service worker to open popup
    chrome.runtime.sendMessage({
      type: 'openPopup',
      url: link.href
    }, response => {
      if (chrome.runtime.lastError) {
        debugLog('Error sending message', chrome.runtime.lastError);
        removeOverlay(); // Remove overlay if there was an error
      } else {
        debugLog('Message sent to service worker');
      }
    });
  });
}

// Add click event listener to all links on the page
function addLinkListeners() {
  debugLog('Adding link click listeners');
  
  // Remove any existing listeners
  document.removeEventListener('click', handleLinkClick, true);
  
  // Add the click listener to the document
  document.addEventListener('click', handleLinkClick, true);
  
  debugLog('Link listeners added');
}

// Initialize when the content script loads
addLinkListeners();

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Message received', message);
  
  if (message.type === 'proceedToUrl') {
    debugLog('Proceeding to URL', message.url);
    removeOverlay();
    window.location.href = message.url;
  } else if (message.type === 'cancelNavigation') {
    debugLog('Navigation cancelled');
    removeOverlay();
  } else if (message.type === 'showOverlay') {
    createOverlay();
  } else if (message.type === 'hideOverlay') {
    removeOverlay();
  }
}); 