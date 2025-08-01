# ClickLoom - Safe Link Scanner Extension

A browser extension that enhances web safety by scanning links before visiting them. The extension intercepts link clicks and provides detailed safety analysis before proceeding to the destination.

## Features

- 🔍 Intercepts all link clicks on any webpage
- 🚦 Provides safety verdict (Safe, Suspicious, Unsafe)
- 📊 Shows detailed analysis of scripts and links
- 💡 Offers recommendations for safe browsing
- 🎯 Risk score visualization
- 📝 Caches scan results for better performance

## Installation

### Chrome/Edge

1. Clone this repository or download the source code
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click any link on a webpage
2. The extension will intercept the click and show a popup
3. Choose to scan the link or proceed directly
   - "Yes, scan it" - performs a safety scan
   - "Skip scan & proceed" - bypasses scanning and goes directly to the site
4. If scanning:
   - View the safety verdict
   - Check the risk score and analysis
   - Read recommendations
   - Choose to proceed or go back

## Testing

The extension includes a test page and helper tools to verify functionality:

1. After loading the extension, right-click on the extension icon and select "Open ClickLoom Test Page"
2. The test page contains various types of links to test different behaviors:
   - Regular links (should be intercepted)
   - Special protocol links (should not be intercepted)
   - Links with modifier keys (should not be intercepted)
   - Dynamically added links (should be intercepted)

## Debugging

To debug the extension:

1. Go to `chrome://extensions/`
2. Find "ClickLoom - Safe Link Scanner" and click on "service worker"
3. This opens DevTools connected to the service worker
4. Look for `[ClickLoom Debug]` messages in the console
5. You can also check content script logs with `[ClickLoom Content]` and popup logs with `[ClickLoom Popup]`

## Technical Details

The extension uses:
- Manifest V3
- Chrome Storage API for URL handling
- Content Scripts for link interception
- Service Worker for background tasks
- DeclarativeNetRequest API for blocking navigation
- Axios for HTTP requests (included locally)
- Modern UI with responsive design

## API Integration

The extension integrates with the scanning API at:
```
https://llm-2g3j.onrender.com/results?url=
```

If the API is unavailable, the extension falls back to mock data for testing purposes.

## Files

- `manifest.json` - Extension configuration
- `content.js` - Link interception and handling
- `service-worker.js` - Background tasks and API calls
- `popup.html` & `popup.js` - User interface and interaction
- `styles.css` - UI styling
- `rules.json` - DeclarativeNetRequest rules
- `test.html` - Test page with various link types
- `icons/` - Extension icons

## Known Issues and Solutions

If links aren't being intercepted:
- Make sure the extension is enabled
- Reload the page
- Check if content script is running (look for `[ClickLoom Content]` messages in the console)

If the "Skip scan & proceed" button doesn't work:
- Check the console for errors
- Ensure the URL is being properly stored in `chrome.storage.local`
- Verify the service worker is running 