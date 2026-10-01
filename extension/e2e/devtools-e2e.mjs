import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(__dirname, '..');
const releaseDir = join(extensionRoot, 'release');

const EXPECTED_API_CARDS = [
  'Prompt API',
  'Summarizer API',
  'Writer API',
  'Rewriter API',
  'Language Detector',
  'Translator API',
  'Proofreader API',
  'Classifier API',
];

function findChromeBinary() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Could not find a Chrome/Chromium binary. Set CHROME_BIN environment variable to the browser executable path.',
  );
}

function verifyReleaseArtifacts() {
  const requiredFiles = [
    'manifest.json',
    'devtools-loader.html',
    'devtools.js',
    'devtools-panel/index.html',
    'service-worker.js',
    'content-script.js',
    'injected.js',
    'offscreen.html',
    'offscreen.js',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = join(releaseDir, relPath);
    assert.ok(
      existsSync(fullPath),
      `Missing required build artifact: ${fullPath}. Run "npm run package" before running E2E tests.`,
    );
  }
}

let cdpMsgId = 1;
function sendCdp(ws, method, params = {}) {
  const id = cdpMsgId++;
  return new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', handler);
      rejectPromise(new Error(`CDP timeout waiting for ${method} (id=${id})`));
    }, 10000);

    const handler = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener('message', handler);
        if (msg.error) {
          rejectPromise(new Error(`CDP error in ${method}: ${JSON.stringify(msg.error)}`));
        } else {
          resolvePromise(msg.result);
        }
      }
    };

    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connectWebSocket(url) {
  const ws = new WebSocket(url);
  await new Promise((resolvePromise, rejectPromise) => {
    ws.onopen = resolvePromise;
    ws.onerror = rejectPromise;
  });
  return ws;
}

async function runE2E() {
  console.log('[E2E] Verifying release artifacts in', releaseDir);
  verifyReleaseArtifacts();

  const chromeBin = findChromeBinary();
  console.log('[E2E] Using Chrome binary:', chromeBin);

  const userDataDir = mkdtempSync(join(tmpdir(), 'webai-devtools-e2e-'));
  const port = 9333 + Math.floor(Math.random() * 500);

  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--enable-unsafe-extension-debugging',
    '--auto-open-devtools-for-tabs',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--disable-popup-blocking',
    '--window-size=1440,900',
    ...(process.platform === 'linux'
      ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      : []),
    'about:blank',
  ];

  const chromeProc = spawn(chromeBin, chromeArgs, {
    stdio: 'ignore',
  });

  try {
    // 1. Wait for Chrome DevTools Protocol HTTP endpoint
    let versionInfo = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) {
          versionInfo = await res.json();
          break;
        }
      } catch {
        // Retry until Chrome starts listening
      }
    }
    assert.ok(versionInfo?.webSocketDebuggerUrl, 'Failed to connect to Chrome remote debugging port');
    console.log('[E2E] Connected to browser:', versionInfo.Browser);

    const browserWs = await connectWebSocket(versionInfo.webSocketDebuggerUrl);

    // 2. Load the unpacked extension from ./release
    const extResult = await sendCdp(browserWs, 'Extensions.loadUnpacked', {
      path: releaseDir,
    });
    const extensionId = extResult?.id;
    assert.ok(extensionId, 'Extensions.loadUnpacked did not return an extension ID');
    console.log('[E2E] Loaded unpacked extension with ID:', extensionId);

    // Allow the extension service worker and DevTools extension registration to settle
    await new Promise((r) => setTimeout(r, 2500));

    // 3. Connect to the DevTools frontend target, select the "WebAI" panel,
    //    and wait for the devtools-panel/index.html iframe target to mount
    // The DevTools window title changes to "DevTools - about:blank" only after
    // DevTools attaches, so poll for it instead of reading the list once.
    let listRes;
    let targets = [];
    let dtTarget = null;
    for (let attempt = 0; attempt < 40 && !dtTarget; attempt++) {
      listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await listRes.json();
      dtTarget = targets.find(
        (t) =>
          t.webSocketDebuggerUrl &&
          t.url.startsWith('devtools://') &&
          t.title.includes('about:blank'),
      );
      if (!dtTarget) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(dtTarget, `Could not find DevTools target for about:blank. Targets: ${JSON.stringify(targets.map(t => ({ type: t.type, title: t.title, url: t.url })))}`);

    const dtWs = await connectWebSocket(dtTarget.webSocketDebuggerUrl);

    let selectedTabId = null;
    for (let attempt = 0; attempt < 20 && !selectedTabId; attempt++) {
      const evalRes = await sendCdp(dtWs, 'Runtime.evaluate', {
        expression: `(async () => {
          const UI = await import('./ui/legacy/legacy.js');
          const iv = UI.InspectorView.InspectorView.instance();
          if (!iv || !iv.tabbedPane) return { tabs: [] };
          const tabs = iv.tabbedPane.tabs.map(t => ({ id: t.id, title: t.title }));
          const webaiTab = iv.tabbedPane.tabs.find(
            t => t.title === 'WebAI' || t.id.includes('WebAI')
          );
          if (webaiTab) {
            iv.tabbedPane.selectTab(webaiTab.id, true);
            return { selected: webaiTab.id, tabs };
          }
          return { selected: null, tabs };
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      selectedTabId = evalRes.result?.value?.selected ?? null;
      if (!selectedTabId) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    assert.ok(
      selectedTabId,
      'WebAI DevTools panel tab was never registered in Chrome DevTools InspectorView',
    );
    console.log('[E2E] Selected WebAI DevTools tab:', selectedTabId);

    let panelTarget = null;
    for (let attempt = 0; attempt < 30 && !panelTarget; attempt++) {
      await new Promise((r) => setTimeout(r, 250));
      listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await listRes.json();
      panelTarget = targets.find(
        (t) => t.webSocketDebuggerUrl && t.url.includes('devtools-panel'),
      );
    }

    if (!panelTarget) {
      const debugEval = await sendCdp(dtWs, 'Runtime.evaluate', {
        expression: `(() => {
          const iframes = [];
          function walk(root) {
            for (const el of root.querySelectorAll('*')) {
              if (el.tagName === 'IFRAME') iframes.push({ src: el.src, visible: el.offsetWidth > 0 });
              if (el.shadowRoot) walk(el.shadowRoot);
            }
          }
          walk(document);
          return { visibilityState: document.visibilityState, iframes };
        })()`,
        returnByValue: true,
      });
      console.error('[E2E] Debug DevTools state:', JSON.stringify(debugEval.result?.value, null, 2));
      console.error('[E2E] Debug /json/list targets:', JSON.stringify(targets.map(t => ({ type: t.type, title: t.title, url: t.url })), null, 2));
    }

    assert.ok(
      panelTarget,
      'devtools-panel/index.html iframe target did not mount after selecting the WebAI DevTools tab',
    );
    console.log('[E2E] Attached to DevTools panel target:', panelTarget.url);

    const panelWs = await connectWebSocket(panelTarget.webSocketDebuggerUrl);

    // 5. Poll the Overview panel until all 8 API capability cards and System Health cards resolve
    let overviewState = null;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const evalRes = await sendCdp(panelWs, 'Runtime.evaluate', {
        expression: `(() => {
          const cardTitles = Array.from(document.querySelectorAll('app-overview h3')).map(el => el.textContent.trim());
          const badgeTexts = Array.from(document.querySelectorAll('app-overview span'))
            .map(el => el.textContent.trim())
            .filter(Boolean);
          const modelCardText = document.querySelector('app-model-download-card')?.innerText?.trim() ?? '';
          const classifierCardText = document.querySelector('lib-classifier-model-card')?.innerText?.trim() ?? '';
          const sidebarText = document.querySelector('app-sidebar')?.innerText?.trim() ?? '';

          const isSettled =
            cardTitles.length >= 8 &&
            !badgeTexts.includes('Checking...') &&
            !badgeTexts.includes('unknown') &&
            modelCardText.length > 0 &&
            !modelCardText.includes('Loading status...') &&
            classifierCardText.includes('Laya') &&
            sidebarText.includes('Nano:') &&
            !sidebarText.includes('Nano: Checking...');

          return {
            isSettled,
            cardTitles,
            badgeTexts,
            modelCardText,
            classifierCardText,
            sidebarText,
          };
        })()`,
        returnByValue: true,
      });

      overviewState = evalRes.result?.value;
      if (overviewState?.isSettled) {
        break;
      }
    }

    assert.ok(overviewState, 'Failed to evaluate DOM state inside devtools-panel');
    for (const expectedTitle of EXPECTED_API_CARDS) {
      assert.ok(
        overviewState.cardTitles.includes(expectedTitle),
        `Missing expected API Capability card "${expectedTitle}". Found: ${JSON.stringify(overviewState.cardTitles)}`,
      );
    }
    assert.ok(
      !overviewState.badgeTexts.includes('Checking...'),
      `API Capability cards remained stuck in "Checking...": ${JSON.stringify(overviewState.badgeTexts)}`,
    );
    assert.ok(
      overviewState.modelCardText.length > 0 &&
        !overviewState.modelCardText.includes('Loading status...'),
      `Gemini Nano model card failed to settle: "${overviewState.modelCardText}"`,
    );
    assert.ok(
      overviewState.classifierCardText.includes('Laya'),
      `Classifier model card failed to render: "${overviewState.classifierCardText}"`,
    );
    assert.ok(
      overviewState.sidebarText.includes('Nano:') &&
        !overviewState.sidebarText.includes('Nano: Checking...'),
      `Sidebar Nano status failed to settle: "${overviewState.sidebarText}"`,
    );
    console.log(
      '[E2E] Overview panel verified: all 8 API cards, Gemini Nano card, Classifier card, and Sidebar settled cleanly.',
      { modelCard: overviewState.modelCardText, badges: overviewState.badgeTexts },
    );

    // 6. Navigate to the Diagnosis panel and verify it completes all checks without hanging
    await sendCdp(panelWs, 'Runtime.evaluate', {
      expression: `(() => {
        const diagLink = Array.from(document.querySelectorAll('app-sidebar a, app-sidebar [routerLink]'))
          .find(el => el.textContent?.includes('Diagnosis'));
        if (diagLink) diagLink.click();
      })()`,
      returnByValue: true,
    });

    let diagnosisState = null;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const evalRes = await sendCdp(panelWs, 'Runtime.evaluate', {
        expression: `(() => {
          const diagEl = document.querySelector('lib-diagnosis');
          if (!diagEl) return null;
          const text = diagEl.innerText || '';
          const isFinished =
            text.includes('Re-run Checks') &&
            !text.includes('Checking...') &&
            text.includes('Prompt API') &&
            text.includes('Classifier API');
          return { isFinished, text };
        })()`,
        returnByValue: true,
      });
      diagnosisState = evalRes.result?.value;
      if (diagnosisState?.isFinished) {
        break;
      }
    }

    assert.ok(
      diagnosisState?.isFinished,
      `Diagnosis panel did not finish running checks cleanly. State: ${JSON.stringify(diagnosisState)}`,
    );
    console.log('[E2E] Diagnosis panel verified: all checks completed without hanging.');

    panelWs.close();
    dtWs.close();
    try {
      await sendCdp(browserWs, 'Browser.close');
    } catch {
      // Ignore if browser closes connection immediately
    }
    browserWs.close();
    console.log('[E2E] PASSED!');
  } finally {
    chromeProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    try {
      chromeProc.kill('SIGKILL');
    } catch {
      // Already exited
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

runE2E()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[E2E] FAILED:', err);
    process.exit(1);
  });
