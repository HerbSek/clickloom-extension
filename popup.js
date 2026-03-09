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

  const startScanButton = document.getElementById('startScan');
  const cancelScanButton = document.getElementById('cancelScan');
  const proceedButton = document.getElementById('proceedToSite');
  const goBackButton = document.getElementById('goBack');

  let currentUrl = '';

  // Helper to create safe DOM info lines (avoids innerHTML XSS)
  function createInfoLine(label, value) {
    const line = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label + ': ';
    line.appendChild(strong);
    line.appendChild(document.createTextNode(value));
    return line;
  }

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

  function displayResults(data) {
    if (data.error && !data.api_fallback) {
      const errorType = data.errorType || 'api_error';
      showError(errorType, data.message);
      return;
    }

    const riskScore = data.risk_score || 3.0;
    updateVerdict(riskScore);

    totalScripts.textContent = data.script_analysis?.total_scripts || 0;
    externalScripts.textContent = data.script_analysis?.external_scripts || 0;
    totalLinks.textContent = data.link_analysis?.total_links || 0;
    externalLinks.textContent = data.link_analysis?.external_links || 0;

    // Summary
    const summaryElement = document.getElementById('summary');
    if (summaryElement) {
      summaryElement.textContent = data.summary || 'No detailed summary available.';
    }

    // Text findings
    const textFindingsElement = document.getElementById('textFindings');
    if (textFindingsElement && data.page_text_findings) {
      const findings = data.page_text_findings;
      let findingsText = '';

      if (findings.phishing_indicators) {
        findingsText += 'Phishing indicators detected\n';
      }

      if (findings.suspicious_phrases && findings.suspicious_phrases.length > 0) {
        findingsText += `Suspicious phrases found: ${findings.suspicious_phrases.length}\n`;
        findings.suspicious_phrases.forEach(phrase => {
          findingsText += `  - "${phrase}"\n`;
        });
      }

      if (!findingsText) {
        findingsText = 'No suspicious text content detected';
      }

      textFindingsElement.textContent = findingsText;
    } else if (textFindingsElement) {
      textFindingsElement.textContent = 'Text analysis not available.';
    }

    // Script details
    const scriptDetailsElement = document.getElementById('scriptDetails');
    if (scriptDetailsElement && data.script_analysis) {
      const scriptAnalysis = data.script_analysis;
      let scriptText = `Total scripts: ${scriptAnalysis.total_scripts || 0}\nExternal scripts: ${scriptAnalysis.external_scripts || 0}\n`;

      if (scriptAnalysis.minified_or_encoded) {
        scriptText += 'Scripts are minified or encoded\n';
      }

      if (scriptAnalysis.suspicious_domains && scriptAnalysis.suspicious_domains.length > 0) {
        scriptText += `Suspicious domains: ${scriptAnalysis.suspicious_domains.length}\n`;
        scriptAnalysis.suspicious_domains.forEach(domain => {
          scriptText += `  - ${domain}\n`;
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
      let linkText = `Total links: ${linkAnalysis.total_links || 0}\nExternal links: ${linkAnalysis.external_links || 0}\n`;

      if (linkAnalysis.redirect_services_used && linkAnalysis.redirect_services_used.length > 0) {
        linkText += `Redirect services used: ${linkAnalysis.redirect_services_used.length}\n`;
        linkAnalysis.redirect_services_used.forEach(service => {
          linkText += `  - ${service}\n`;
        });
      }

      if (linkAnalysis.phishing_like_links && linkAnalysis.phishing_like_links.length > 0) {
        linkText += `Phishing-like links: ${linkAnalysis.phishing_like_links.length}\n`;
        linkAnalysis.phishing_like_links.forEach(link => {
          linkText += `  - ${link}\n`;
        });
      }

      if (!linkAnalysis.redirect_services_used?.length && !linkAnalysis.phishing_like_links?.length) {
        linkText += 'No suspicious link patterns detected';
      }

      linkDetailsElement.textContent = linkText;
    } else if (linkDetailsElement) {
      linkDetailsElement.textContent = 'Link analysis not available.';
    }

    // Recommendations
    recommendations.textContent = data.recommendations || 'No specific recommendations available.';

    showScreen('results');

    // Update domain trust status after scan
    setTimeout(async () => {
      if (currentUrl) {
        await checkDomainTrustStatus(currentUrl);
      }
    }, 500);
  }

  function showError(errorType, customMessage = null) {
    loadingScreen.style.display = 'none';

    let icon, title, message, showRetry = true;

    switch (errorType) {
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

    // Build error UI safely
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align: center; padding: 20px;';

    const iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size: 32px; margin-bottom: 15px;';
    iconEl.textContent = icon;
    wrapper.appendChild(iconEl);

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #e74c3c; font-size: 18px; font-weight: bold; margin-bottom: 10px;';
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);

    const msgEl = document.createElement('div');
    msgEl.style.cssText = 'color: #555; font-size: 14px; margin-bottom: 20px; line-height: 1.4;';
    msgEl.textContent = message;
    wrapper.appendChild(msgEl);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

    const btnStyle = 'color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';

    if (showRetry) {
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Try Scan Again';
      retryBtn.style.cssText = `background: #3498db; ${btnStyle}`;
      retryBtn.addEventListener('click', () => {
        showScreen('loading');
        chrome.runtime.sendMessage({ type: 'scanUrl', url: currentUrl })
          .then(response => displayResults(response))
          .catch(() => showError('api_error', 'Scan failed again. Please check your connection.'));
      });
      btnGroup.appendChild(retryBtn);
    }

    const proceedBtn = document.createElement('button');
    proceedBtn.textContent = 'Proceed to Site';
    proceedBtn.style.cssText = `background: #27ae60; ${btnStyle}`;
    proceedBtn.addEventListener('click', () => proceedToUrl(currentUrl));
    btnGroup.appendChild(proceedBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `background: #95a5a6; ${btnStyle}`;
    cancelBtn.addEventListener('click', () => cancelNavigation());
    btnGroup.appendChild(cancelBtn);

    wrapper.appendChild(btnGroup);
    errorDiv.appendChild(wrapper);

    initialScreen.innerHTML = '';
    initialScreen.appendChild(errorDiv);
    initialScreen.classList.add('active');
  }

  async function proceedToUrl(url) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'proceedToUrl',
        url: url
      });

      if (response.success) {
        window.close();
      } else {
        const errorType = response.errorType || 'navigation_failed';
        showError(errorType, response.error);
      }
    } catch (error) {
      showError('navigation_failed', 'Failed to communicate with extension.');
    }
  }

  async function cancelNavigation() {
    try {
      await chrome.runtime.sendMessage({ type: 'cancelNavigation' });
      window.close();
    } catch (error) {
      window.close();
    }
  }

  async function initPopup() {
    try {
      const { clickedUrl } = await chrome.storage.local.get('clickedUrl');
      if (clickedUrl) {
        currentUrl = clickedUrl;
        urlToScan.textContent = clickedUrl;
        scannedUrl.textContent = clickedUrl;
        await checkDomainTrustStatus(clickedUrl);
      }
    } catch (error) {
      // Popup initialization failed
    }
  }

  async function checkDomainTrustStatus(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const fullUrl = urlObj.href;

      const response = await chrome.runtime.sendMessage({ type: 'getTrustedDomains' });

      if (response && response.domains) {
        const isTrusted = response.domains.includes(domain);
        displayDomainStatus(isTrusted, domain, fullUrl);
      } else {
        displayDomainStatus(false, domain, fullUrl);
      }
    } catch (error) {
      try {
        const urlObj = new URL(url);
        displayDomainStatus(false, urlObj.hostname, url);
      } catch (e) {
        // URL parsing failed
      }
    }
  }

  function displayDomainStatus(isTrusted, domain, fullUrl) {
    const domainStatus = document.getElementById('domainStatus');
    const statusTrusted = document.getElementById('statusTrusted');
    const statusNew = document.getElementById('statusNew');
    const domainInfoTrusted = document.getElementById('domainInfoTrusted');
    const domainInfoNew = document.getElementById('domainInfoNew');

    domainStatus.style.display = 'block';

    if (isTrusted) {
      statusTrusted.style.display = 'block';
      statusNew.style.display = 'none';

      domainInfoTrusted.textContent = '';
      domainInfoTrusted.appendChild(createInfoLine('Domain', domain));
      domainInfoTrusted.appendChild(createInfoLine('URL', fullUrl));
      domainInfoTrusted.appendChild(createInfoLine('Trust Level', 'Full Trust (Domain + All Sublinks)'));
      domainInfoTrusted.appendChild(createInfoLine('Status', 'Approved and Trusted'));
    } else {
      statusTrusted.style.display = 'none';
      statusNew.style.display = 'block';

      domainInfoNew.textContent = '';
      domainInfoNew.appendChild(createInfoLine('Domain', domain));
      domainInfoNew.appendChild(createInfoLine('URL', fullUrl));
      domainInfoNew.appendChild(createInfoLine('Trust Level', 'Not Yet Trusted'));
      domainInfoNew.appendChild(createInfoLine('Status', 'Requires Approval'));
      domainInfoNew.appendChild(createInfoLine('Note', 'After approval, all sublinks will be automatically trusted'));
      domainInfoNew.className = 'domain-info new-domain';
    }
  }

  // Event Listeners
  startScanButton.addEventListener('click', async () => {
    showScreen('loading');

    const slowTimer = setTimeout(() => {
      const loadingEl = document.querySelector('.loading .small-text');
      if (loadingEl) {
        loadingEl.textContent = 'Taking longer than expected — the server may be starting up...';
      }
    }, 15000);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'scanUrl',
        url: currentUrl
      });

      clearTimeout(slowTimer);
      displayResults(response);
    } catch (error) {
      clearTimeout(slowTimer);
      if (error.message && error.message.includes('Extension context invalidated')) {
        showError('api_error', 'Extension was reloaded. Please close this popup and try again.');
      } else if (error.message && error.message.includes('Could not establish connection')) {
        showError('api_error', 'Connection to extension failed. Please reload the extension.');
      } else {
        showError('api_error', 'An unexpected error occurred during scanning. Please try again.');
      }
    }
  });

  cancelScanButton.addEventListener('click', () => {
    if (!currentUrl) return;
    proceedToUrl(currentUrl);
  });

  proceedButton.addEventListener('click', () => {
    if (!currentUrl) return;
    proceedToUrl(currentUrl);
  });

  goBackButton.addEventListener('click', () => {
    cancelNavigation();
  });

  initPopup();
});
