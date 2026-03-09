// Create and add overlay to block all interactions
function createOverlay() {
  if (document.getElementById('clickloom-overlay')) return;

  try {
    const overlay = document.createElement('div');
    overlay.id = 'clickloom-overlay';

    const message = document.createElement('div');
    message.id = 'clickloom-overlay-message';
    message.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 10px;">ClickLoom is scanning this link...</div>
      <div style="margin: 15px 0;">
        <div style="
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 4px solid white;
          width: 30px;
          height: 30px;
          margin: 0 auto;
          animation: clickloom-spin 1s linear infinite;
        "></div>
      </div>
      <div style="font-size: 14px; color: #ccc;">Please wait while we check for security threats</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes clickloom-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(message);
    document.body.appendChild(overlay);

    // Prevent all interactions
    const stop = e => e.stopPropagation();
    ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress'].forEach(evt => {
      overlay.addEventListener(evt, stop);
    });
  } catch (error) {
    // Cannot create overlay on this page
  }
}

function removeOverlay() {
  try {
    const overlay = document.getElementById('clickloom-overlay');
    if (overlay) overlay.remove();
  } catch (error) {
    // Overlay removal failed
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'cancelNavigation' || message.type === 'hideOverlay') {
      removeOverlay();
    } else if (message.type === 'showOverlay') {
      createOverlay();
    }
  } catch (error) {
    // Message handling failed
  }
});
