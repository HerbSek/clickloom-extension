// Debug logging function
function debugLog(message, data) {
  console.log(`[ClickLoom Popup] ${message}`, data || '');
}

// Initialize with debug info
debugLog('Popup script loaded');
debugLog('Using Axios version', axios.VERSION);

// Initialize DOM Elements and Event Listeners after the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  debugLog('DOM content loaded');
  
  // DOM Elements
  const initialScreen = document.querySelector('.initial-screen');
  const loadingScreen = document.querySelector('.loading');
  const resultsScreen = document.querySelector('.results-screen');
  const urlToScan = document.getElementById('urlToScan');
  const scannedUrl = document.getElementById('scannedUrl');
  const verdictElement = document.querySelector('.verdict');
  const verdictIcon = document.querySelector('.verdict-icon');
  const verdictText = document.querySelector('.verdict-text');
  const scoreBar = document.querySelector('.score-fill');
  const totalScripts = document.getElementById('totalScripts');
  const externalScripts = document.getElementById('externalScripts');
  const totalLinks = document.getElementById('totalLinks');
  const externalLinks = document.getElementById('externalLinks');
  const recommendations = document.getElementById('recommendations');

  // Button Elements
  const startScanButton = document.getElementById('startScan');
  const cancelScanButton = document.getElementById('cancelScan');
  const proceedButton = document.getElementById('proceedToSite');
  const goBackButton = document.getElementById('goBack');

  let currentUrl = '';

  // Show specific screen
  function showScreen(screen) {
    debugLog('Showing screen', screen);
    initialScreen.classList.remove('active');
    loadingScreen.style.display = 'none';
    resultsScreen.classList.remove('active');

    if (screen === 'initial') {
      initialScreen.classList.add('active');
    } else if (screen === 'loading') {
      loadingScreen.style.display = 'block';
    } else if (screen === 'results') {
      resultsScreen.classList.add('active');
    }
  }

  // Update verdict UI based on risk score
  function updateVerdict(score) {
    debugLog('Updating verdict with score', score);
    let verdict, icon;
    if (score <= 3) {
      verdict = 'safe';
      icon = '✓';
    } else if (score <= 7) {
      verdict = 'suspicious';
      icon = '⚠';
    } else {
      verdict = 'unsafe';
      icon = '⛔';
    }

    verdictElement.className = `verdict ${verdict}`;
    verdictIcon.textContent = icon;
    verdictText.textContent = verdict.charAt(0).toUpperCase() + verdict.slice(1);
    scoreBar.style.width = `${score * 10}%`;
    scoreBar.className = `score-fill ${verdict}`;
  }

  // Display scan results
  function displayResults(data) {
    debugLog('Displaying scan results', data);
    updateVerdict(data.risk_score);
    
    totalScripts.textContent = data.script_analysis.total_scripts;
    externalScripts.textContent = data.script_analysis.external_scripts;
    totalLinks.textContent = data.link_analysis.total_links;
    externalLinks.textContent = data.link_analysis.external_links;
    
    recommendations.textContent = data.recommendations;
    
    showScreen('results');
  }

  // Navigate to URL
  async function navigateToUrl(url) {
    debugLog('Navigating to URL', url);
    try {
      await chrome.runtime.sendMessage({
        type: 'allowUrl',
        url: url
      });
      
      debugLog('Navigation request sent');
      window.close();
    } catch (error) {
      console.error('Error navigating to URL:', error);
    }
  }

  // Cancel navigation
  async function cancelNavigation() {
    debugLog('Cancelling navigation');
    try {
      await chrome.runtime.sendMessage({
        type: 'cancelUrl'
      });
      
      debugLog('Cancel request sent');
      window.close();
    } catch (error) {
      console.error('Error cancelling navigation:', error);
    }
  }

  // Initialize popup
  async function initPopup() {
    debugLog('Initializing popup');
    try {
      const { clickedUrl } = await chrome.storage.local.get('clickedUrl');
      debugLog('Retrieved clicked URL from storage', clickedUrl);
      if (clickedUrl) {
        currentUrl = clickedUrl;
        urlToScan.textContent = clickedUrl;
        scannedUrl.textContent = clickedUrl;
      } else {
        debugLog('No clicked URL found in storage');
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // Event Listeners
  startScanButton.addEventListener('click', async () => {
    debugLog('Start scan button clicked');
    showScreen('loading');
    
    try {
      debugLog('Sending scanUrl message', currentUrl);
      const response = await chrome.runtime.sendMessage({
        type: 'scanUrl',
        url: currentUrl
      });
      
      debugLog('Scan response received', response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      displayResults(response);
    } catch (error) {
      console.error('Error during scan:', error);
      showScreen('initial');
    }
  });

  cancelScanButton.addEventListener('click', async () => {
    debugLog('Cancel/Skip scan button clicked');
    navigateToUrl(currentUrl);
  });

  proceedButton.addEventListener('click', async () => {
    debugLog('Proceed button clicked');
    navigateToUrl(currentUrl);
  });

  goBackButton.addEventListener('click', () => {
    debugLog('Go back button clicked');
    cancelNavigation();
  });

  // Initialize popup
  initPopup();
}); 