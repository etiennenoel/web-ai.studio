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
    // Optional: Code to run when the panel is created
    console.log("Panel created successfully");
  }
);
