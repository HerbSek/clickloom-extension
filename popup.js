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
      showError(data.message);
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
    
    // Update domain trust status after scan
    setTimeout(async () => {
      if (currentUrl) {
        await checkDomainTrustStatus(currentUrl);
      }
    }, 500);
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
        // Show error to user
        alert('Navigation failed. Please try again.');
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
        
        // Check and display domain trust status
        await checkDomainTrustStatus(clickedUrl);
      } else {
        console.error('No clickedUrl found in storage!');
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // Check if the current URL's domain is already trusted
  async function checkDomainTrustStatus(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const fullUrl = urlObj.href;
      
      console.log('Checking domain trust status for:', domain);
      
      const response = await chrome.runtime.sendMessage({
        type: 'getTrustedDomains'
      });
      
      if (response && response.domains) {
        console.log('Current trusted domains:', response.domains);
        const isTrusted = response.domains.includes(domain);
        displayDomainStatus(isTrusted, domain, fullUrl, response.domains);
      } else {
        console.log('No trusted domains found');
        displayDomainStatus(false, domain, fullUrl, []);
      }
    } catch (error) {
      console.error('Error checking domain trust status:', error);
      // Fallback to showing as new domain
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        displayDomainStatus(false, domain, url, []);
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
  }

  // Display domain trust status with detailed information
  function displayDomainStatus(isTrusted, domain, fullUrl, trustedDomains) {
    const domainStatus = document.getElementById('domainStatus');
    const statusTrusted = document.getElementById('statusTrusted');
    const statusNew = document.getElementById('statusNew');
    const domainInfoTrusted = document.getElementById('domainInfoTrusted');
    const domainInfoNew = document.getElementById('domainInfoNew');
    
    domainStatus.style.display = 'block';
    
    if (isTrusted) {
      statusTrusted.style.display = 'block';
      statusNew.style.display = 'none';
      
      // Show trusted domain info
      domainInfoTrusted.innerHTML = `
        <strong>Domain:</strong> ${domain}<br>
        <strong>URL:</strong> ${fullUrl}<br>
        <strong>Trust Level:</strong> Full Trust (Domain + All Sublinks)<br>
        <strong>Status:</strong> ✅ Approved and Trusted
      `;
    } else {
      statusTrusted.style.display = 'none';
      statusNew.style.display = 'block';
      
      // Show new domain info
      domainInfoNew.innerHTML = `
        <strong>Domain:</strong> ${domain}<br>
        <strong>URL:</strong> ${fullUrl}<br>
        <strong>Trust Level:</strong> Not Yet Trusted<br>
        <strong>Status:</strong> ⚠️ Requires Approval<br>
        <strong>Note:</strong> After approval, all sublinks will be automatically trusted
      `;
      domainInfoNew.className = 'domain-info new-domain';
    }
    
    // Update debug information
    updateDebugInfo(domain, isTrusted, trustedDomains);
    
    console.log(`Domain ${domain} is ${isTrusted ? 'trusted' : 'not trusted'}`);
  }

  // Update debug information
  function updateDebugInfo(domain, isTrusted, trustedDomains) {
    const debugSection = document.getElementById('debugSection');
    const debugContent = document.getElementById('debugContent');
    
    debugSection.style.display = 'block';
    
    const timestamp = new Date().toLocaleTimeString();
    const debugInfo = `
      <strong>Timestamp:</strong> ${timestamp}<br>
      <strong>Current Domain:</strong> ${domain}<br>
      <strong>Trust Status:</strong> ${isTrusted ? '✅ TRUSTED' : '❌ NOT TRUSTED'}<br>
      <strong>Total Trusted Domains:</strong> ${trustedDomains.length}<br>
      <strong>Trusted Domains List:</strong><br>
      ${trustedDomains.length > 0 ? trustedDomains.map(d => `  • ${d}`).join('<br>') : '  (none)'}<br>
      <strong>Note:</strong> This updates in real-time as you approve domains
    `;
    
    debugContent.innerHTML = debugInfo;
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

  // Refresh domain status button
  document.getElementById('refreshDomainStatus').addEventListener('click', async () => {
    console.log('Refreshing domain status for:', currentUrl);
    if (currentUrl) {
      await checkDomainTrustStatus(currentUrl);
    }
  });

  // Toggle debug information
  document.getElementById('toggleDebug').addEventListener('click', () => {
    const debugContent = document.getElementById('debugContent');
    const toggleBtn = document.getElementById('toggleDebug');
    
    if (debugContent.style.display === 'none') {
      debugContent.style.display = 'block';
      toggleBtn.textContent = 'Hide Debug';
    } else {
      debugContent.style.display = 'none';
      toggleBtn.textContent = 'Show Debug';
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