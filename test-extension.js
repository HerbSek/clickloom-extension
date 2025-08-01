// This script helps test the ClickLoom extension
console.log("ClickLoom Extension Test Helper");

// Instructions for testing
console.log(`
=============================================
CLICKLOOM EXTENSION TESTING INSTRUCTIONS
=============================================

1. Load the extension:
   - Go to chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

2. Open the test page:
   - Right-click on test.html in your file explorer
   - Open with Chrome/Edge

3. Test the extension:
   - Click on various links to test interception
   - Try the "Skip scan & proceed" button
   - Try the "Yes, scan it" button
   - Check the console for debug logs

4. Debug tips:
   - Open the service worker by clicking "service worker" on the extension card
   - Look for [ClickLoom Debug] messages in the console
   - Check for any errors in the console

5. If links aren't being intercepted:
   - Make sure the extension is enabled
   - Reload the page
   - Check if content script is running (look for [ClickLoom Content] messages)

=============================================
`);

// Function to open the test page
function openTestPage() {
  const testPagePath = chrome.runtime.getURL('test.html');
  chrome.tabs.create({ url: testPagePath });
}

// Add a context menu item for easy testing
chrome.contextMenus.create({
  id: 'open-test-page',
  title: 'Open ClickLoom Test Page',
  contexts: ['action'],
  onclick: openTestPage
}); 