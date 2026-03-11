# Web AI Studio

## Chrome WebAI Extension Local Installation

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (which includes `npm`)

### Installation Steps

1. Open your terminal and navigate to the `extension` directory within the repository:
   ```bash
   cd extension
   ```

2. Install the necessary dependencies (if you haven't already):
   ```bash
   npm install
   ```

3. Build and package the extension:
   ```bash
   npm run package
   ```
   This command uses a custom script to assemble the final extension artifact into a `release` folder inside the `extension` directory.

4. Open the Google Chrome browser and navigate to the Extensions management page by typing this URL in your address bar:
   ```
   chrome://extensions
   ```

5. Enable **Developer mode** by toggling the switch in the top right corner of the Extensions page.

6. Click on the **Load unpacked** button that appears in the top left.

7. Select the `release` folder located inside the `extension` directory (`path/to/web-ai.studio/extension/release`).

The Chrome WebAI Extension should now be installed locally and visible in your browser! To update the extension after making code changes, run `npm run package` again and click the **Reload** button on the extension card in Chrome.
