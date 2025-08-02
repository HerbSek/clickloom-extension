// Import Axios from local file
importScripts('axios.min.js');

// Cache for storing scan results
let scanCache = new Map();
let allowedUrls = new Set();

// Test helper functionality
// Function to open the test page
function openTestPage() {
  const testPagePath = chrome.runtime.getURL('test.html');
  chrome.tabs.create({ url: testPagePath });
}

// Add a context menu item for easy testing
try {
  chrome.contextMenus.create({
    id: 'open-test-page',
    title: 'Open ClickLoom Test Page',
    contexts: ['action'],
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-test-page') {
      openTestPage();
    }
  });
} catch (error) {
  console.error('Error setting up test helper:', error);
}

// Function to scan a URL using the API
async function scanUrl(url) {
  try {
    const apiUrl = 'https://llm-2g3j.onrender.com/results';
    
    const response = await axios.get(apiUrl, {
      params: {
        link: url
      },
      timeout: 15000, // 15 second timeout
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data) {
      // Ensure risk_score is present (some API responses might not have it)
      if (!response.data.risk_score && response.data.verdict) {
        // Assign risk score based on verdict if not present
        switch(response.data.verdict.toLowerCase()) {
          case 'safe':
            response.data.risk_score = 1.0;
            break;
          case 'suspicious':
            response.data.risk_score = 5.0;
            break;
          case 'unsafe':
            response.data.risk_score = 8.0;
            break;
          default:
            response.data.risk_score = 3.0;
        }
      }
      
      return response.data;
    } else {
      throw new Error(`Invalid API response: ${response.status}`);
    }
  } catch (error) {
    console.error('API error:', error.message);
    return {
      error: true,
      message: "Cannot retrieve scan results at this time. Please try again later."
    };
  }
}

// Function to send message to content script
async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return;
    }
    
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error('Error sending message to content script:', error);
  }
}

// Function to enable blocking
async function enableBlocking() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [{
        id: 1,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame"]
        }
      }]
    });
  } catch (error) {
    console.error('Error enabling blocking:', error);
  }
}

// Function to disable blocking for a specific URL
async function allowUrl(url) {
  try {
    allowedUrls.add(url);
    
    // Instead of just allowing one URL, we'll remove the blocking rule
    // This is more reliable for the "Skip scan & proceed" functionality
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    });
  } catch (error) {
    console.error('Error allowing URL:', error);
  }
}

// Function to open the popup
async function openPopup() {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('No active tab found');
      return;
    }

    // Open the popup
    await chrome.action.openPopup();
  } catch (error) {
    console.error('Error opening popup:', error);
  }
}

// Function to handle navigation to a URL
async function navigateToUrl(url) {
  try {
    // Allow the URL
    await allowUrl(url);
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('No active tab found for navigation');
      return;
    }
    
    // Send message to content script to proceed
    await sendMessageToActiveTab({
      type: 'proceedToUrl',
      url: url
    });
  } catch (error) {
    console.error('Error navigating to URL:', error);
  }
}

// Function to cancel navigation
async function cancelNavigation() {
  try {
    // Send message to content script to cancel
    await sendMessageToActiveTab({
      type: 'cancelNavigation'
    });
  } catch (error) {
    console.error('Error cancelling navigation:', error);
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'openPopup') {
      openPopup();
      return true;
    } else if (message.type === 'scanUrl') {
      // Check cache first
      if (scanCache.has(message.url)) {
        sendResponse(scanCache.get(message.url));
        return true;
      }

      // Scan URL and respond
      scanUrl(message.url).then(data => {
        // Cache the results
        scanCache.set(message.url, data);
        sendResponse(data);
      });

      return true; // Required for async response
    } else if (message.type === 'allowUrl') {
      navigateToUrl(message.url);
      return true;
    } else if (message.type === 'cancelUrl') {
      cancelNavigation();
      return true;
    } else if (message.type === 'showOverlay') {
      sendMessageToActiveTab({ type: 'showOverlay' });
      return true;
    } else if (message.type === 'hideOverlay') {
      sendMessageToActiveTab({ type: 'hideOverlay' });
      return true;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Clear old cache entries periodically (every hour)
setInterval(() => {
  scanCache.clear();
  allowedUrls.clear();
  enableBlocking(); // Re-enable blocking after clearing cache
}, 3600000);

// Enable blocking when the service worker starts
enableBlocking();

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;

  // If URL is not in allowed list, prevent navigation
  if (!allowedUrls.has(details.url)) {
    // Store the URL and show popup
    await chrome.storage.local.set({ 'clickedUrl': details.url });
    
    // Show overlay on the page
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'showOverlay' });
      }
    } catch (error) {
      // Ignore errors for new page loads
    }
    
    openPopup();
  }
}); 