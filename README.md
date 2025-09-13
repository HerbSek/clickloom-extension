# ClickLoom - Safe Link Scanner

A Chrome/Edge browser extension that enhances web safety by scanning links before visiting them. ClickLoom intercepts link clicks, provides security analysis, and gives users control over their browsing safety.

## Features

- **Link Interception**: Automatically intercepts all link clicks on web pages
- **Security Scanning**: Scans links for potential security threats using AI-powered analysis
- **User Control**: Gives users the choice to scan, proceed directly, or cancel navigation
- **Real-time Analysis**: Provides detailed security reports including risk scores, script analysis, and recommendations
- **Full-page Overlay**: Blocks user interaction during scanning to ensure focused decision-making

## Installation

1. **Download the Extension**:
   - Clone or download this repository to your local machine

2. **Load in Chrome/Edge**:
   - Open your browser and navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the extension folder

3. **Verify Installation**:
   - The ClickLoom icon should appear in your browser toolbar
   - Right-click the icon and select "Open ClickLoom Test Page" to test the extension

4. **Run the following APIs in your browser before running the extension**:
   - [Scraper](https://clickloom-scraper.onrender.com/healthy)
   - [RAG](https://llm-2g3j.onrender.com/healthy)

## Usage

### Basic Workflow

1. **Browse Normally**: Visit any website as you normally would
2. **Click a Link**: When you click on any link, ClickLoom will intercept it
3. **Make Your Choice**: A popup will appear with options:
   - **"Yes, scan it"**: Scan the link for security threats
   - **"No, proceed directly"**: Skip scanning and go directly to the link
4. **View Results**: If you choose to scan, you'll see:
   - Security verdict (Safe/Suspicious/Unsafe)
   - Risk score (1-10 scale)
   - Script analysis (total scripts, external scripts)
   - Link analysis (total links, external links)
   - Security recommendations
5. **Take Action**: After scanning, choose:
   - **"Proceed to Site"**: Continue to the original link
   - **"Cancel Navigation"**: Stay on the current page

### Understanding Scan Results

- **Risk Score**: 1-3 (Safe), 4-7 (Suspicious), 8-10 (Unsafe)
- **Script Analysis**: Shows how many scripts the site loads and their sources
- **Link Analysis**: Displays internal vs external link distribution
- **Recommendations**: Specific advice based on the security analysis

## Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Injected into web pages for link interception
- **Service Worker**: Background processing and API communication
- **DeclarativeNetRequest API**: Browser-level navigation control
- **Axios**: HTTP client for API requests (included locally)

### Key Components

- `manifest.json`: Extension configuration and permissions
- `content.js`: Link interception and overlay management
- `service-worker.js`: Background processing and API calls
- `popup.html/js`: User interface for scan decisions
- `styles.css`: Visual styling for popup and overlay
- `rules.json`: Network request blocking rules

### Permissions

- `storage`: Store clicked URLs and scan results
- `activeTab`: Access current tab information
- `scripting`: Inject content scripts
- `tabs`: Manage browser tabs
- `webNavigation`: Monitor navigation events
- `declarativeNetRequest`: Block/allow network requests
- `contextMenus`: Add right-click menu options

## File Structure

```
clickloom-extension/
├── manifest.json          # Extension configuration
├── content.js            # Link interception logic
├── service-worker.js     # Background processing
├── popup.html           # User interface
├── popup.js             # Popup functionality
├── styles.css           # Visual styling
├── rules.json           # Network blocking rules
├── test.html            # Testing page
├── axios.min.js         # HTTP client library
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Testing

1. **Load the Extension**: Follow the installation steps above
2. **Open Test Page**: Right-click the extension icon and select "Open ClickLoom Test Page"
3. **Test Different Links**: Try clicking various types of links on the test page
4. **Check Functionality**: Verify that:
   - Links are intercepted
   - Overlay appears
   - Popup opens with options
   - Scanning works (may show mock data if API is unavailable)
   - Navigation works correctly

## Troubleshooting

### Common Issues

1. **Extension Not Loading**:
   - Check that all files are present in the extension folder
   - Ensure "Developer mode" is enabled in browser extensions
   - Reload the extension if needed

2. **Links Not Being Intercepted**:
   - Verify the extension is enabled
   - Check browser console for errors
   - Try refreshing the page

3. **API Not Working**:
   - The extension will show mock data if the API is unavailable
   - This is normal behavior for testing purposes

### Error Messages

- **"No active tab found"**: Usually resolves by refreshing the page
- **"API error"**: Extension will use mock data instead
- **"Error creating overlay"**: May occur on certain page types

## Development

### Making Changes

1. **Edit Files**: Modify the relevant JavaScript/CSS files
2. **Reload Extension**: Click the reload button in `chrome://extensions/`
3. **Test Changes**: Use the test page to verify functionality

### Key Functions

- `handleLinkClick()`: Intercepts link clicks
- `scanUrl()`: Makes API calls for security scanning
- `createOverlay()`: Shows blocking overlay
- `navigateToUrl()`: Handles user navigation choices

## Security

- **Local Processing**: All sensitive operations happen locally
- **API Communication**: Only sends URLs to the scanning service
- **No Data Collection**: Does not store or transmit personal information
- **Transparent**: Open source code for full transparency

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Test with the provided test page
4. Ensure all files are properly loaded 

## Demo
https://github.com/user-attachments/assets/7d317c66-aa7b-430e-94bf-3f315a43ade7


