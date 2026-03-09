// Import Axios from local file
importScripts('axios.min.js');

// Configuration constants
const CONFIG = {
  API_URL: 'https://llm-2g3j.onrender.com/results',
  API_TIMEOUT: 60000,
  RULE_ACTIVATION_DELAY: 300,
  RULE_CLEANUP_DELAY: 10000,
  CACHE_CLEANUP_INTERVAL: 3600000,
  MAX_CACHE_SIZE: 200,
  MAX_TRUSTED_DOMAINS: 500,
};

// Cache for storing scan results
let scanCache = new Map();
let allowedUrls = new Set();
let trustedDomains = new Set();

// Load trusted domains from storage on startup
chrome.storage.local.get(['trustedDomains'], (result) => {
  if (result.trustedDomains) {
    result.trustedDomains.forEach(domain => trustedDomains.add(domain));
  }
});

// Function to validate URL
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Function to scan a URL using the API
async function scanUrl(url) {
  try {
    if (!isValidUrl(url)) {
      return {
        error: true,
        errorType: 'invalid_url',
        message: 'The URL is not valid or uses an unsupported protocol.'
      };
    }

    const response = await axios.get(CONFIG.API_URL, {
      params: { link: url },
      timeout: CONFIG.API_TIMEOUT,
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 200 && response.data) {
      // Ensure risk_score is present
      if (!response.data.risk_score && response.data.verdict) {
        switch (response.data.verdict.toLowerCase()) {
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
    const fallbackAnalysis = generateFallbackAnalysis(url);
    return {
      ...fallbackAnalysis,
      error: true,
      message: 'API unavailable. Showing basic analysis based on URL patterns.',
      api_fallback: true
    };
  }
}

// Generate fallback analysis when API is unavailable
function generateFallbackAnalysis(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    let riskScore = 3.0;
    let verdict = 'suspicious';

    if (hostname.includes('phish') || hostname.includes('scam') || hostname.includes('malware')) {
      riskScore = 9.0;
      verdict = 'unsafe';
    } else if (hostname.includes('bit.ly') || hostname.includes('tinyurl') || hostname.includes('goo.gl')) {
      riskScore = 6.0;
      verdict = 'suspicious';
    }

    if (urlObj.protocol === 'https:') {
      riskScore = Math.max(1, riskScore - 1);
    }

    return {
      risk_score: riskScore,
      verdict: verdict,
      summary: `Basic analysis: ${verdict} (${riskScore}/10). ${urlObj.protocol === 'https:' ? 'HTTPS enabled.' : 'HTTP only - consider HTTPS.'}`,
      script_analysis: { total_scripts: 0, external_scripts: 0 },
      link_analysis: { total_links: 0, external_links: 0 },
      page_text_findings: {
        phishing_indicators: riskScore > 7,
        suspicious_phrases: []
      }
    };
  } catch (error) {
    return {
      risk_score: 5.0,
      verdict: 'suspicious',
      summary: 'Unable to analyze URL. Proceed with caution.',
      error: true
    };
  }
}

// Function to send message to content script with error handling
async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      if (error.message && error.message.includes('Could not establish connection')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, message);
            } catch (retryError) {
              // Content script unavailable
            }
          }, 100);
        } catch (injectionError) {
          // Cannot inject into this page
        }
      }
    }
  } catch (error) {
    // Tab not available
  }
}

// Function to enable selective blocking
async function enableBlocking() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [{
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame']
        }
      }]
    });
  } catch (error) {
    // Blocking rule failed — extension may not function correctly
  }
}

// Function to allow a specific URL and navigate
async function allowUrlAndNavigate(url) {
  try {
    allowedUrls.add(url);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Automatically trust the entire domain
    if (!trustedDomains.has(domain)) {
      if (trustedDomains.size >= CONFIG.MAX_TRUSTED_DOMAINS) {
        const oldest = trustedDomains.values().next().value;
        trustedDomains.delete(oldest);
      }
      trustedDomains.add(domain);
      chrome.storage.local.set({ trustedDomains: Array.from(trustedDomains) });
    }

    // Create allow rule with higher priority than block rule
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [2],
      addRules: [{
        id: 2,
        priority: 10,
        action: { type: 'allow' },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
        }
      }]
    });

    await new Promise(resolve => setTimeout(resolve, CONFIG.RULE_ACTIVATION_DELAY));

    await chrome.tabs.update(tab.id, { url: url });

    // Remove allow rule after page loads
    setTimeout(async () => {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [2]
        });
      } catch (error) {
        // Rule cleanup failed
      }
    }, CONFIG.RULE_CLEANUP_DELAY);

    return true;
  } catch (error) {
    return false;
  }
}

// Function to check if a URL should be intercepted
function shouldInterceptUrl(url) {
  try {
    if (allowedUrls.has(url)) return false;

    if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return false;
    }

    const urlObj = new URL(url);
    if (['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'data:', 'blob:', 'javascript:', 'file:', 'edge:'].includes(urlObj.protocol)) {
      return false;
    }

    if (trustedDomains.has(urlObj.hostname)) return false;

    if (isUrlFromApprovedDomain(urlObj)) return false;

    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Function to check if a URL belongs to an already approved domain
function isUrlFromApprovedDomain(urlObj) {
  try {
    const hostname = urlObj.hostname.toLowerCase();

    for (const allowedUrl of allowedUrls) {
      try {
        const allowedUrlObj = new URL(allowedUrl);
        const allowedHostname = allowedUrlObj.hostname.toLowerCase();
        if (hostname === allowedHostname || hostname.endsWith('.' + allowedHostname)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Function to open the popup
async function openPopup() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    await chrome.action.openPopup();
  } catch (error) {
    // Popup may already be open or cannot be opened programmatically
  }
}

// Proceed to URL (used by popup)
async function proceedToUrl(url) {
  try {
    return await allowUrlAndNavigate(url);
  } catch (error) {
    return false;
  }
}

// Function to cancel navigation
async function cancelNavigation() {
  try {
    await sendMessageToActiveTab({ type: 'cancelNavigation' });
  } catch (error) {
    // Cancel failed
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'openPopup') {
      openPopup();
      return true;
    } else if (message.type === 'scanUrl') {
      if (scanCache.has(message.url)) {
        sendResponse(scanCache.get(message.url));
        return true;
      }

      scanUrl(message.url).then(data => {
        if (scanCache.size >= CONFIG.MAX_CACHE_SIZE) {
          const oldest = scanCache.keys().next().value;
          scanCache.delete(oldest);
        }
        scanCache.set(message.url, data);
        sendResponse(data);
      });

      return true;
    } else if (message.type === 'proceedToUrl') {
      proceedToUrl(message.url).then((success) => {
        if (success) {
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: 'Navigation failed. The website may be unreachable.',
            errorType: 'navigation_failed'
          });
        }
      }).catch(() => {
        sendResponse({
          success: false,
          error: 'Navigation failed unexpectedly.',
          errorType: 'navigation_failed'
        });
      });
      return true;
    } else if (message.type === 'cancelNavigation') {
      cancelNavigation();
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'getTrustedDomains') {
      sendResponse({ domains: Array.from(trustedDomains) });
      return true;
    }
  } catch (error) {
    sendResponse({ error: 'Internal error' });
  }
});

// Function to clear all allow rules
async function clearAllowRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [2, 3, 4, 5]
    });
  } catch (error) {
    // Rule cleanup failed
  }
}

// Clear old cache entries periodically
setInterval(() => {
  scanCache.clear();
  allowedUrls.clear();
  clearAllowRules();
  enableBlocking();
}, CONFIG.CACHE_CLEANUP_INTERVAL);

// Enable blocking when the service worker starts
enableBlocking();

// Listen for blocked navigation attempts
chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (details.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;

  // If this is a trusted/allowed domain, silently let it through
  if (!shouldInterceptUrl(details.url)) {
    try {
      const urlObj = new URL(details.url);
      const domain = urlObj.hostname;

      // Create temporary allow rule and re-navigate
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [2],
        addRules: [{
          id: 2,
          priority: 10,
          action: { type: 'allow' },
          condition: {
            urlFilter: `*://${domain}/*`,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
          }
        }]
      });

      await new Promise(resolve => setTimeout(resolve, CONFIG.RULE_ACTIVATION_DELAY));
      await chrome.tabs.update(details.tabId, { url: details.url });

      setTimeout(async () => {
        try {
          await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [2] });
        } catch (e) {
          // Cleanup failed
        }
      }, CONFIG.RULE_CLEANUP_DELAY);
    } catch (error) {
      // Auto-allow failed
    }
    return;
  }

  await chrome.storage.local.set({ clickedUrl: details.url });

  try {
    await chrome.tabs.sendMessage(details.tabId, { type: 'showOverlay' });
  } catch (error) {
    // Content script not available on this tab
  }

  openPopup();
});

// Also listen for beforeNavigate as backup
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!shouldInterceptUrl(details.url)) return;
  if (allowedUrls.has(details.url)) return;

  await chrome.storage.local.set({ clickedUrl: details.url });
  openPopup();
});
