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

// Add context menu items for easy testing
try {
  // Remove existing context menu items first
  chrome.contextMenus.removeAll(() => {
    // Create new context menu items
    chrome.contextMenus.create({
      id: 'open-test-page',
      title: 'Open ClickLoom Test Page',
      contexts: ['action'],
    });

    chrome.contextMenus.create({
      id: 'open-webrequest-test',
      title: 'Open Complete Blocking Test',
      contexts: ['action'],
    });

    chrome.contextMenus.create({
      id: 'open-navigation-flow-test',
      title: 'Open Navigation Flow Test',
      contexts: ['action'],
    });
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-test-page') {
      openTestPage();
    } else if (info.menuItemId === 'open-webrequest-test') {
      const testPagePath = chrome.runtime.getURL('test-webRequest.html');
      chrome.tabs.create({ url: testPagePath });
    } else if (info.menuItemId === 'open-navigation-flow-test') {
      const testPagePath = chrome.runtime.getURL('test-navigation-flow.html');
      chrome.tabs.create({ url: testPagePath });
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
      timeout: 120000, // 2 minute timeout
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
      console.log('Scan results:', response.data);
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

// Function to send message to content script with better error handling
async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      // If content script not ready, try to inject it
      if (error.message.includes('Could not establish connection')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          // Wait a bit for injection, then try again
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, message);
            } catch (retryError) {
              console.log('Could not send message after injection:', retryError.message);
            }
          }, 100);
        } catch (injectionError) {
          console.log('Could not inject content script:', injectionError.message);
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error sending message to content script:', error);
  }
}

// Function to enable comprehensive blocking
async function enableBlocking() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1], // Remove existing block rule
      addRules: [{
        id: 1,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame"],
          excludedInitiatorDomains: ["chrome-extension"]
        }
      }]
    });
    console.log('Blocking enabled for all navigation');
  } catch (error) {
    console.error('Error enabling blocking:', error);
  }
}

// Function to allow a specific URL and navigate
async function allowUrlAndNavigate(url) {
  try {
    console.log('Allowing URL and navigating to:', url);

    // Add to allowed URLs
    allowedUrls.add(url);

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('No active tab found for navigation');
      return false;
    }

    // Create a specific allow rule for this domain with higher priority
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    console.log('Creating persistent allow rule for domain:', domain);

    // Create allow rule with higher priority than block rule
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [2], // Remove any existing allow rule
      addRules: [{
        id: 2,
        priority: 10, // Much higher priority than block rule (priority 1)
        action: { type: "allow" },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
        }
      }]
    });

    console.log('Allow rule created with high priority, navigating to:', url);

    // Wait for rule to take effect
    await new Promise(resolve => setTimeout(resolve, 300));

    // Navigate to the URL
    await chrome.tabs.update(tab.id, { url: url });

    console.log('Navigation completed to:', url);

    // Keep the allow rule active for longer to ensure page loads completely
    setTimeout(async () => {
      try {
        console.log('Removing allow rule after page load');
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [2]
        });
        console.log('Allow rule removed, blocking restored for future navigation');
      } catch (error) {
        console.error('Error removing allow rule:', error);
      }
    }, 10000); // 10 seconds to allow full page load

    return true;
  } catch (error) {
    console.error('Error allowing URL and navigating:', error);
    return false;
  }
}

// Function to check if a URL should be intercepted
function shouldInterceptUrl(url) {
  try {
    // Don't intercept if URL is already allowed
    if (allowedUrls.has(url)) {
      return false;
    }

    // Don't intercept extension pages
    if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return false;
    }

    // Don't intercept special protocols
    const urlObj = new URL(url);
    if (['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'data:', 'blob:', 'javascript:', 'file:'].includes(urlObj.protocol)) {
      return false;
    }

    // Only intercept http and https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    console.error('Error checking URL:', error);
    return false;
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

// Simple function to proceed to URL (used by popup)
async function proceedToUrl(url) {
  try {
    console.log('Proceeding to URL:', url);

    // Check current rules before proceeding
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    console.log('Current dynamic rules before navigation:', rules);

    const success = await allowUrlAndNavigate(url);

    // Check rules after creating allow rule
    const rulesAfter = await chrome.declarativeNetRequest.getDynamicRules();
    console.log('Dynamic rules after creating allow rule:', rulesAfter);

    return success;
  } catch (error) {
    console.error('Error proceeding to URL:', error);
    return false;
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
    } else if (message.type === 'proceedToUrl') {
      proceedToUrl(message.url).then((success) => {
        sendResponse({ success: success });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Required for async response
    } else if (message.type === 'cancelNavigation') {
      cancelNavigation();
      sendResponse({ success: true });
      return true;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Function to clear all allow rules
async function clearAllowRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [2, 3, 4, 5] // Remove any allow rules
    });
    console.log('All allow rules cleared');
  } catch (error) {
    console.error('Error clearing allow rules:', error);
  }
}

// Clear old cache entries periodically (every hour)
setInterval(() => {
  scanCache.clear();
  allowedUrls.clear();
  clearAllowRules(); // Clear any lingering allow rules
  enableBlocking(); // Re-enable blocking after clearing cache
}, 3600000);

// Enable blocking when the service worker starts
enableBlocking();

// Listen for blocked navigation attempts
chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  // Only handle main frame navigation errors
  if (details.frameId !== 0) return;

  // Check if this is a blocked request (error: net::ERR_BLOCKED_BY_CLIENT)
  if (details.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;

  // Check if this URL should be intercepted
  if (!shouldInterceptUrl(details.url)) {
    return;
  }

  console.log('Blocked navigation detected:', details.url);

  // Store the URL for the popup
  await chrome.storage.local.set({ 'clickedUrl': details.url });

  // Show overlay and open popup
  try {
    await chrome.tabs.sendMessage(details.tabId, { type: 'showOverlay' });
  } catch (error) {
    console.log('Could not send overlay message:', error.message);
  }

  openPopup();
});

// Also listen for beforeNavigate as backup
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;

  // Check if this URL should be intercepted
  if (!shouldInterceptUrl(details.url)) {
    return;
  }

  // Only intercept if URL is not already allowed
  if (allowedUrls.has(details.url)) {
    return;
  }

  console.log('WebNavigation intercepting:', details.url);

  // Store the URL for the popup
  await chrome.storage.local.set({ 'clickedUrl': details.url });

  openPopup();
});