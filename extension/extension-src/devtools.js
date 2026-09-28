/**
 * Create the panel.
 * * arg1: Panel Title
 * arg2: Icon path (relative to the root of the extension)
 * arg3: The HTML file to load (The built Angular artifact)
 */
chrome.devtools.panels.create(
  "WebAI",
  "assets/images/icon.png",
  "devtools-panel/index.html", // <--- CRITICAL: Matches your Angular build output path
  (panel) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      console.error("Failed to create WebAI DevTools panel:", chrome.runtime.lastError.message);
      return;
    }
    console.log("Panel created successfully", panel);
  }
);
