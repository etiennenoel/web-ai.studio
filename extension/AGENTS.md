# **AGENTS.md**

## **Project Architecture: Angular Chrome Extension (Custom Build)**

This repository uses a **Hybrid Monorepo** architecture. It strictly separates the "Extension Platform" (Manifest/Background) from the "Angular UI" (Panels/Popups).

**Crucial:** We do **not** rely on Angular CLI's assets configuration to build the final extension. We use a custom shell script (package.sh) to assemble the final artifact in the release/ folder.

### **1\. Directory Structure**

* **extension-src/** (The Platform Layer)
  * **Role:** Contains raw Chrome Extension files.
  * **Contents:** manifest.json, service\_worker.js, devtools.js, devtools-loader.html.
  * **Build Behavior:** These are copied directly to release/ by the build script.
* **projects/** (The UI Layer)
  * **Role:** Standard Angular applications.
  * **Current Projects:** devtools-panel, on-install.
  * **Build Behavior:** Built via ng build, then artifacts are manually moved to release/\<project-name\> by the script.
* **release/** (The Artifact)
  * **Role:** The **ONLY** folder that should be loaded into Chrome (Load Unpacked).
  * **Structure:**  
    release/  
    ├── manifest.json  
    ├── service\_worker.js  
    ├── devtools-panel/  \<-- (From dist/devtools-panel/browser)  
    │    ├── index.html  
    │    └── ...bundles  
    └── on-install/      \<-- (From dist/on-install/browser)  
    ├── index.html  
    └── ...bundles

### **2\. The Build System (package.sh)**

**DO NOT** assume ng build creates the final extension. You must use the custom package script.

* **Command:** npm run package (executes package.sh)
* **Workflow:**
  1. **Clean:** Removes release/.
  2. **Platform:** Copies extension-src/\* to release/.
  3. **Compile:** Runs ng build devtools-panel and ng build on-install.
  4. **Assemble:** Copies the contents of dist/\<project\>/browser/\* into release/\<project\>/.

### **3\. Angular Configuration (angular.json)**

The angular.json is configured specifically to support this manual assembly process. **Do not modify these core settings:**

1. **Builder:** We use @angular/build:application (Esbuild).
2. **Base Href:** Must be "baseHref": "./".
  * *Reason:* The app runs in a subdirectory inside the extension (chrome-extension://id/devtools-panel/index.html).
3. **Output Path:** Standard default (dist/\<project\>).
  * *Note:* The script handles moving files from dist to release.
4. **Assets:** Only project-specific assets (e.g., projects/devtools-panel/public) are configured here.
  * *Note:* extension-src is **NOT** in the assets array.

### **4\. Chrome Extension Manifest & Linking**

Because of the folder structure created by package.sh, references in extension-src files must point to subdirectories:

* **manifest.json**:
  * Background: "service\_worker": "service\_worker.js" (Root)
  * DevTools: "devtools\_page": "devtools-loader.html" (Root)
* **devtools.js**:
  * Panel Creation: chrome.devtools.panels.create(..., "devtools-panel/index.html", ...)
* **service\_worker.js**:
  * Opening Tabs: chrome.tabs.create({ url: "on-install/index.html" })

### **5\. Coding Standards**

* **Routing:** Use HashLocationStrategy (e.g., provideRouter(routes, withHashLocation())). PushState routing does not work in extensions.
* **Zone.js:** Wrap all Chrome API callbacks (e.g., chrome.runtime.onMessage) inside ngZone.run(() \=\> { ... }) to ensure UI updates.
* **Asset References:** In HTML/SCSS, use relative paths (e.g., src="./assets/logo.png"), never absolute paths.

### **6\. Development Workflow**

To test changes:

1. Make code changes in projects/ or extension-src/.
2. Run npm run package.
3. Go to chrome://extensions.
4. Click **Reload** on the extension card (points to release/ folder).

### **7\. How to Update the Extension Version**

To update the version number of the Chrome WebAI Extension, follow these steps:

1.  **Edit `package.json`**: Modify the `"version"` field in the root `package.json` file. This is the single source of truth for the version.
    ```json
    {
      "name": "chrome-webai-extension",
      "version": "0.2.1", // Update this line
      "scripts": {
        // ...
      },
      // ...
    }
    ```
2.  **Run the Packaging Script**: Execute the `npm run package` command. This script automates the synchronization of the version number to `extension-src/manifest.json` and `projects/base/src/lib/version.ts`.
    ```bash
    npm run package
    ```
    Agents should run this command after modifying the version in `package.json`.
3.  **Reload the Extension**: In Chrome, navigate to `chrome://extensions`, locate the "Chrome WebAI Extension", and click the **Reload** button to apply the new version.