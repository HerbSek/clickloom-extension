// Initialize DOM Elements and Event Listeners after the document is loaded
document.addEventListener('DOMContentLoaded', () => {
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
    // Check if there's an error
    if (data.error) {
      showError(data.message);
      return;
    }
    
    updateVerdict(data.risk_score);
    
    totalScripts.textContent = data.script_analysis.total_scripts;
    externalScripts.textContent = data.script_analysis.external_scripts;
    totalLinks.textContent = data.link_analysis.total_links;
    externalLinks.textContent = data.link_analysis.external_links;
    
    recommendations.textContent = data.recommendations;
    
    showScreen('results');
  }

  // Show error message
  function showError(message) {
    // Hide loading screen
    loadingScreen.style.display = 'none';
    
    // Create error message in the initial screen
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="color: #e74c3c; font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <div style="color: #e74c3c; font-size: 16px; margin-bottom: 15px;">${message}</div>
        <button id="retryScan" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-right: 10px;
        ">Retry Scan</button>
        <button id="proceedAnyway" style="
          background: #95a5a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        ">Proceed Anyway</button>
      </div>
    `;
    
    // Clear the initial screen and add error message
    initialScreen.innerHTML = '';
    initialScreen.appendChild(errorDiv);
    initialScreen.classList.add('active');
    
    // Add event listeners for error buttons
    document.getElementById('retryScan').addEventListener('click', () => {
      // Restore original initial screen
      location.reload();
    });
    
    document.getElementById('proceedAnyway').addEventListener('click', () => {
      navigateToUrl(currentUrl);
    });
  }

  // Navigate to URL
  async function navigateToUrl(url) {
    try {
      await chrome.runtime.sendMessage({
        type: 'allowUrl',
        url: url
      });
      
      window.close();
    } catch (error) {
      console.error('Error navigating to URL:', error);
    }
  }

  // Cancel navigation
  async function cancelNavigation() {
    try {
      await chrome.runtime.sendMessage({
        type: 'cancelUrl'
      });
      
      window.close();
    } catch (error) {
      console.error('Error cancelling navigation:', error);
    }
  }

  // Initialize popup
  async function initPopup() {
    try {
      const { clickedUrl } = await chrome.storage.local.get('clickedUrl');
      if (clickedUrl) {
        currentUrl = clickedUrl;
        urlToScan.textContent = clickedUrl;
        scannedUrl.textContent = clickedUrl;
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // Event Listeners
  startScanButton.addEventListener('click', async () => {
    showScreen('loading');
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'scanUrl',
        url: currentUrl
      });
      
      displayResults(response);
    } catch (error) {
      console.error('Error during scan:', error);
      showError("An unexpected error occurred. Please try again.");
    }
  });

  cancelScanButton.addEventListener('click', async () => {
    navigateToUrl(currentUrl);
  });

  proceedButton.addEventListener('click', async () => {
    navigateToUrl(currentUrl);
  });

  goBackButton.addEventListener('click', () => {
    cancelNavigation();
  });

  // Initialize popup
  initPopup();
}); 