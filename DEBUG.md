# ClickLoom Extension Debugging Guide

This guide will help you troubleshoot and debug the ClickLoom extension.

## Common Issues and Solutions

### 1. Links aren't being intercepted

**Symptoms:**
- Clicking links navigates directly without showing the popup
- No console logs from content script

**Solutions:**
- Make sure the extension is enabled in `chrome://extensions/`
- Reload the page (sometimes content scripts need a page refresh)
- Check if the content script is running by looking for `[ClickLoom Content]` messages in the console
- Verify that the link has a valid `href` attribute
- Check if the link uses a special protocol (mailto:, tel:, javascript:) which is intentionally ignored

### 2. "Skip scan & proceed" button doesn't work

**Symptoms:**
- Clicking the button doesn't navigate to the site
- The popup closes but no navigation happens

**Solutions:**
- Open the service worker console and check for errors
- Verify that `currentUrl` is properly set in popup.js
- Make sure the `allowUrl` function is being called
- Check if the tab update is working correctly

### 3. Popup doesn't open

**Symptoms:**
- Link is clicked but no popup appears
- Service worker logs show it's trying to open the popup

**Solutions:**
- Make sure the popup HTML and JS files are correctly loaded
- Check if there are any errors in the service worker console
- Try reloading the extension

## Debugging Tools

### Service Worker Console

1. Go to `chrome://extensions/`
2. Find "ClickLoom - Safe Link Scanner"
3. Click on "service worker" link
4. Look for messages with `[ClickLoom Debug]` prefix
5. Check for any errors

### Content Script Console

1. Open DevTools on the page where you're testing links (F12 or right-click > Inspect)
2. Look for messages with `[ClickLoom Content]` prefix
3. Check if the link click events are being captured

### Popup Console

1. Right-click on the extension popup when it's open
2. Select "Inspect" to open DevTools for the popup
3. Look for messages with `[ClickLoom Popup]` prefix
4. Check if UI events are working correctly

## Testing with Test Page

The extension includes a test page to verify different behaviors:

1. Right-click on the extension icon
2. Select "Open ClickLoom Test Page"
3. Try clicking different types of links:
   - Regular links (should be intercepted)
   - Special protocol links (should not be intercepted)
   - Links with modifier keys (should not be intercepted)

## Logging Levels

The extension uses a simple logging system with the following prefixes:

- `[ClickLoom Debug]` - Service worker logs
- `[ClickLoom Content]` - Content script logs
- `[ClickLoom Popup]` - Popup UI logs

## Advanced Debugging

### Inspecting Storage

To check what URLs are stored:

1. Open the service worker console
2. Run: `chrome.storage.local.get(null, console.log)`

### Testing URL Blocking

To check if URL blocking is working:

1. Open the service worker console
2. Run: `chrome.declarativeNetRequest.getDynamicRules(console.log)`

### Clearing Cache

To clear the cache manually:

1. Open the service worker console
2. Run: `scanCache.clear(); allowedUrls.clear();`

### Reloading the Extension

If all else fails, try:

1. Go to `chrome://extensions/`
2. Find "ClickLoom - Safe Link Scanner"
3. Click the reload icon (circular arrow)
4. Reload any open tabs where you're testing 