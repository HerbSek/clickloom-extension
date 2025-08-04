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
    console.log('Displaying results:', data); // Debug log

    // Check if there's an error
    if (data.error) {
      const errorType = data.errorType || 'api_error';
      showError(errorType, data.message);
      return;
    }

    // Ensure we have a risk score
    const riskScore = data.risk_score || 3.0;
    console.log('Risk score:', riskScore); // Debug log
    updateVerdict(riskScore);
    
    // Basic analysis with fallbacks
    totalScripts.textContent = data.script_analysis?.total_scripts || 0;
    externalScripts.textContent = data.script_analysis?.external_scripts || 0;
    totalLinks.textContent = data.link_analysis?.total_links || 0;
    externalLinks.textContent = data.link_analysis?.external_links || 0;
    
    // Summary
    const summaryElement = document.getElementById('summary');
    if (summaryElement && data.summary) {
      summaryElement.textContent = data.summary;
    } else if (summaryElement) {
      summaryElement.textContent = 'No detailed summary available.';
    }
    
    // Text findings
    const textFindingsElement = document.getElementById('textFindings');
    if (textFindingsElement && data.page_text_findings) {
      const findings = data.page_text_findings;
      let findingsText = '';
      
      if (findings.phishing_indicators) {
        findingsText += '⚠️ Phishing indicators detected\n';
      }
      
      if (findings.suspicious_phrases && findings.suspicious_phrases.length > 0) {
        findingsText += `🚨 Suspicious phrases found: ${findings.suspicious_phrases.length}\n`;
        findings.suspicious_phrases.forEach(phrase => {
          findingsText += `• "${phrase}"\n`;
        });
      }
      
      if (!findingsText) {
        findingsText = '✅ No suspicious text content detected';
      }
      
      textFindingsElement.textContent = findingsText;
    } else if (textFindingsElement) {
      textFindingsElement.textContent = 'Text analysis not available.';
    }
    
    // Script details
    const scriptDetailsElement = document.getElementById('scriptDetails');
    if (scriptDetailsElement && data.script_analysis) {
      const scriptAnalysis = data.script_analysis;
      let scriptText = '';
      
      scriptText += `📊 Total scripts: ${scriptAnalysis.total_scripts || 0}\n`;
      scriptText += `🌐 External scripts: ${scriptAnalysis.external_scripts || 0}\n`;
      
      if (scriptAnalysis.minified_or_encoded) {
        scriptText += '🔒 Scripts are minified or encoded\n';
      }
      
      if (scriptAnalysis.suspicious_domains && scriptAnalysis.suspicious_domains.length > 0) {
        scriptText += `⚠️ Suspicious domains: ${scriptAnalysis.suspicious_domains.length}\n`;
        scriptAnalysis.suspicious_domains.forEach(domain => {
          scriptText += `• ${domain}\n`;
        });
      }
      
      scriptDetailsElement.textContent = scriptText;
    } else if (scriptDetailsElement) {
      scriptDetailsElement.textContent = 'Script analysis not available.';
    }
    
    // Link details
    const linkDetailsElement = document.getElementById('linkDetails');
    if (linkDetailsElement && data.link_analysis) {
      const linkAnalysis = data.link_analysis;
      let linkText = '';
      
      linkText += `🔗 Total links: ${linkAnalysis.total_links || 0}\n`;
      linkText += `🌐 External links: ${linkAnalysis.external_links || 0}\n`;
      
      if (linkAnalysis.redirect_services_used && linkAnalysis.redirect_services_used.length > 0) {
        linkText += `🔄 Redirect services used: ${linkAnalysis.redirect_services_used.length}\n`;
        linkAnalysis.redirect_services_used.forEach(service => {
          linkText += `• ${service}\n`;
        });
      }
      
      if (linkAnalysis.phishing_like_links && linkAnalysis.phishing_like_links.length > 0) {
        linkText += `🚨 Phishing-like links: ${linkAnalysis.phishing_like_links.length}\n`;
        linkAnalysis.phishing_like_links.forEach(link => {
          linkText += `• ${link}\n`;
        });
      }
      
      if (!linkText.includes('🚨') && !linkText.includes('🔄')) {
        linkText += '✅ No suspicious link patterns detected';
      }
      
      linkDetailsElement.textContent = linkText;
    } else if (linkDetailsElement) {
      linkDetailsElement.textContent = 'Link analysis not available.';
    }
    
    // Recommendations
    if (data.recommendations) {
      recommendations.textContent = data.recommendations;
    } else {
      recommendations.textContent = 'No specific recommendations available.';
    }
    
    showScreen('results');
  }

  // Enhanced error handling with different error types
  function showError(errorType, customMessage = null) {
    // Hide loading screen
    loadingScreen.style.display = 'none';

    let icon, title, message, showRetry = true;

    switch(errorType) {
      case 'api_timeout':
        icon = '⏱️';
        title = 'Scan Timeout';
        message = customMessage || 'The security scan is taking longer than expected. This might be due to network issues or high server load.';
        break;
      case 'api_error':
        icon = '🌐';
        title = 'Network Error';
        message = customMessage || 'Unable to connect to the security scanning service. Please check your internet connection.';
        break;
      case 'api_unavailable':
        icon = '🔧';
        title = 'Service Unavailable';
        message = customMessage || 'The security scanning service is temporarily unavailable. Please try again later.';
        break;
      case 'invalid_url':
        icon = '🚫';
        title = 'Invalid Website';
        message = customMessage || 'The website URL appears to be invalid or the site does not exist.';
        showRetry = false;
        break;
      case 'navigation_failed':
        icon = '❌';
        title = 'Navigation Failed';
        message = customMessage || 'Unable to navigate to the website. The site may be down or unreachable.';
        showRetry = false;
        break;
      default:
        icon = '⚠️';
        title = 'Error';
        message = customMessage || 'An unexpected error occurred. Please try again.';
    }

    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 32px; margin-bottom: 15px;">${icon}</div>
        <div style="color: #e74c3c; font-size: 18px; font-weight: bold; margin-bottom: 10px;">${title}</div>
        <div style="color: #555; font-size: 14px; margin-bottom: 20px; line-height: 1.4;">${message}</div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          ${showRetry ? `
            <button id="retryScan" style="
              background: #3498db;
              color: white;
              border: none;
              padding: 12px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
            ">🔄 Try Scan Again</button>
          ` : ''}
          <button id="proceedAnyway" style="
            background: #27ae60;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          ">➡️ Proceed to Site</button>
          <button id="cancelNavigation" style="
            background: #95a5a6;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          ">❌ Cancel</button>
        </div>
      </div>
    `;

    // Clear the initial screen and add error message
    initialScreen.innerHTML = '';
    initialScreen.appendChild(errorDiv);
    initialScreen.classList.add('active');

    // Add event listeners for error buttons
    if (showRetry) {
      document.getElementById('retryScan').addEventListener('click', () => {
        console.log('Retrying scan for:', currentUrl);
        showScreen('loading');
        // Retry the scan
        chrome.runtime.sendMessage({
          type: 'scanUrl',
          url: currentUrl
        }).then(response => {
          displayResults(response);
        }).catch(error => {
          console.error('Retry scan error:', error);
          showError('api_error', 'Scan failed again. Please check your connection.');
        });
      });
    }

    document.getElementById('proceedAnyway').addEventListener('click', () => {
      console.log('Proceeding anyway to:', currentUrl);
      proceedToUrl(currentUrl);
    });

    document.getElementById('cancelNavigation').addEventListener('click', () => {
      console.log('Cancelling navigation');
      cancelNavigation();
    });
  }

  // Navigate to URL (proceed directly or after scan)
  async function proceedToUrl(url) {
    try {
      console.log('Popup: Proceeding to URL:', url);

      const response = await chrome.runtime.sendMessage({
        type: 'proceedToUrl',
        url: url
      });

      console.log('Popup: Proceed response:', response);

      if (response.success) {
        console.log('Navigation successful, closing popup');
        window.close();
      } else {
        console.error('Navigation failed:', response.error);
        // Show navigation error to user
        const errorType = response.errorType || 'navigation_failed';
        showError(errorType, response.error);
      }
    } catch (error) {
      console.error('Error proceeding to URL:', error);
    }
  }

  // Cancel navigation
  async function cancelNavigation() {
    try {
      console.log('Popup: Cancelling navigation');

      await chrome.runtime.sendMessage({
        type: 'cancelNavigation'
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
      console.log('Popup initialized with URL:', clickedUrl);
      if (clickedUrl) {
        currentUrl = clickedUrl;
        urlToScan.textContent = clickedUrl;
        scannedUrl.textContent = clickedUrl;
        console.log('Current URL set to:', currentUrl);
      } else {
        console.error('No clickedUrl found in storage!');
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // Event Listeners
  startScanButton.addEventListener('click', async () => {
    console.log('Starting scan for:', currentUrl);
    showScreen('loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'scanUrl',
        url: currentUrl
      });

      displayResults(response);
    } catch (error) {
      console.error('Error during scan:', error);
      // Handle different types of scan errors
      if (error.message && error.message.includes('Extension context invalidated')) {
        showError('api_error', 'Extension was reloaded. Please close this popup and try again.');
      } else if (error.message && error.message.includes('Could not establish connection')) {
        showError('api_error', 'Connection to extension failed. Please reload the extension.');
      } else {
        showError('api_error', 'An unexpected error occurred during scanning. Please try again.');
      }
    }
  });

  cancelScanButton.addEventListener('click', async () => {
    console.log('Cancel scan button clicked, proceeding directly to:', currentUrl);
    if (!currentUrl) {
      console.error('No current URL set!');
      return;
    }
    proceedToUrl(currentUrl);
  });

  proceedButton.addEventListener('click', async () => {
    console.log('Proceed button clicked after scan, going to:', currentUrl);
    if (!currentUrl) {
      console.error('No current URL set!');
      return;
    }
    proceedToUrl(currentUrl);
  });

  goBackButton.addEventListener('click', () => {
    cancelNavigation();
  });

  // Initialize popup
  initPopup();
}); 