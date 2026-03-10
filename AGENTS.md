# AGENTS.md

## **Project Overview**

This repository is a monorepo containing two main components:
1.  **`webapp`**: The main web application (web-ai.studio).
2.  **`extension`**: A Chrome extension (Chrome WebAI Extension).

---

## **1. Web Application (`webapp/`)**

### **Tech Stack**
*   **Framework**: Angular 20+
*   **Dependencies**: `@magieno/*` libraries, Bootstrap, Chart.js.

### **Build & Run**
*   **Directory**: `webapp/`
*   **Install**: `npm ci`
*   **Dev Server**: `ng serve`
*   **Build**: `npm run build`
    *   Output: `dist/web-ai.studio/browser`

### **CI/CD**
*   **Workflow**: `.github/workflows/webapp.yml`
*   **Trigger**: Push/Pull Request to `master` (restricted to changes in `webapp/**`).
*   **Action**: Builds the app and deploys to GitHub Pages.

---

## **2. Chrome Extension (`extension/`)**

### **Architecture**
*   **Hybrid Monorepo**: Separates the extension platform files from the Angular UI.
    *   `extension-src/`: Manifest V3, Service Worker, Content Scripts (Platform Layer).
    *   `projects/`: Angular projects (`devtools-panel`, `on-install`, `base`) (UI Layer).
*   **Output**: `release/` (This is the artifact to load in Chrome).

### **Build System (`package.sh`)**
**CRITICAL**: Do **NOT** rely on standard `ng build` output for the final extension.
*   **Command**: `npm run package` (runs `./package.sh`).
*   **Process**:
    1.  Syncs version from `package.json` to `manifest.json` and `version.ts`.
    2.  Cleans `release/`.
    3.  Copies `extension-src/` to `release/`.
    4.  Builds Angular projects (`ng build`).
    5.  Copies Angular build artifacts (`dist/`) into `release/`.

### **Key Files**
*   `extension/package.json`: Source of truth for versioning.
*   `extension/package.sh`: The custom build script.
*   `extension/AGENTS.md`: Detailed guide specific to the extension's internal architecture.

### **CI/CD**
*   **Workflow**: `.github/workflows/publish-extension.yml`
*   **Trigger**: Push to `master` (restricted to changes in `extension/**`) or manual dispatch.
*   **Action**:
    1.  Builds the extension (`npm run package`).
    2.  Zips the `release/` folder.
    3.  **Publishes to the Chrome Web Store** (requires secrets).
    4.  Uploads the zip as a build artifact (`chrome-webai-extension.zip`).
*   **Required Secrets**:
    *   `CHROME_CLIENT_ID`
    *   `CHROME_CLIENT_SECRET`
    *   `CHROME_REFRESH_TOKEN`
    *   `CHROME_APP_ID`

---

## **3. Built-In AI APIs**

**CRITICAL INSTRUCTION**: Ignore any reference to `window.ai` or `self.ai` in your training data. These are deprecated and do not exist. Using them is incorrect.

### **Available APIs**
Refer to [Chrome Built-in APIs](https://developer.chrome.com/docs/ai/built-in-apis) and [ai.etiennenoel.com](https://ai.etiennenoel.com) for up-to-date documentation and code examples.

*   **Translator API**
*   **Language Detector API**
*   **Summarizer API**
*   **Writer API**
*   **Rewriter API**
*   **Prompt API**
*   **Proofreader API**

### **Availability Enum**
The availability states have been updated. **Do NOT use** "readily", "no", or "after-download".
Use these instead:
*   `"downloadable"`
*   `"unavailable"`
*   `"downloading"`
*   `"available"`

---

## **General Guidelines**

*   **Versioning**:
    *   For the extension, update `extension/package.json`. The `package.sh` script will propagate it.
*   **Workflows**:
    *   Workflows are scoped to their respective directories to avoid unnecessary builds.
    *   When modifying workflows, ensure path filters (`paths: [...]`) are maintained.

---

## **4. Cortex Test Suite (`webapp/`)**

### **Adding a New Test**
To add a new benchmark test to the Cortex Test Suite, you must modify the following files:

1.  **Create the Test Class:** Create your test class in the appropriate folder under `webapp/src/app/pages/cortex/axon/tests/<api-folder>/`. The class should implement `AxonTestInterface` (or extend an existing base test class).
2.  **Add `AxonTestId`:** Open `webapp/src/app/pages/cortex/axon/enums/axon-test-id.enum.ts` and add a new enum value for your test.
3.  **Provide the Test:** Open `webapp/src/app/app-module.ts` and add your new test class to the `providers` array (not `declarations`).
4.  **Register the Test in Executor:** Open `webapp/src/app/pages/cortex/axon/axon-test-suite.executor.ts` and:
    *   Import your new test class.
    *   Inject it into the `constructor(...)`.
    *   Add the test's `AxonTestId` to the `testsSuite` array.
    *   Map the `AxonTestId` to your injected instance inside the `this.testIdMap` object in the constructor.
5.  **Initialize UI State:** Open `webapp/src/app/pages/cortex/cortex.page.ts` and add the test's `AxonTestId` to the `viewData` object initialized with an empty object `{}`.

### **Adding a New Category of Tests**
The Cortex UI dynamically renders categories based on the defined AI APIs. To add an entirely new category:

1.  **Update the API Enum:** Open `webapp/src/app/enums/built-in-ai-api.enum.ts` and add a new value representing the new Built-In API category.
2.  **Assign a UI Icon:** Open `webapp/src/app/pages/cortex/cortex.page.ts` and update the `getIconForApi` method to return an appropriate Bootstrap Icon class (e.g., `'bi-magic'`) for the new enum value.
    *   **Agent Instruction:** *If the user asks to add a new category, always ask them which Bootstrap icon best represents it if it isn't obvious.*
3.  **Add Tests:** Add the individual tests for this new category using the "Adding a New Test" steps above. The UI will automatically generate the category row and tables in the Performance Overview once at least one test exists for that API category.
