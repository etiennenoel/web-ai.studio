# Chrome WebAI Extension

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.2.

## Versioning

The extension's version number is managed in the root `package.json` file. To update the version:

1.  Edit the `"version"` field in `package.json` (e.g., from `"0.2.0"` to `"0.2.1"`).
2.  After updating `package.json`, run the packaging script to synchronize the version across `manifest.json` and `projects/base/src/lib/version.ts`:
    ```bash
    npm run package
    ```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## Local Inference Setup (LM Studio & llama.cpp)

You can route Built-In AI API calls (like `window.ai.prompt`, `summarizer`, etc.) to your own local models using the **Provider Manager** in the extension Settings. This is incredibly useful for testing Web AI features without waiting for Chrome to download native models.

Both **LM Studio** and **llama.cpp** expose an OpenAI-compatible REST API, making them perfectly suited to serve as backend providers for this extension.

### 1. Setting up LM Studio

[LM Studio](https://lmstudio.ai/) is a desktop app for running open-source models locally.

1.  Download and install LM Studio.
2.  Search and download a small, capable instruction-following model (e.g., `Llama-3-8B-Instruct-GGUF` or `Gemma-2-9B-It-GGUF`).
3.  Navigate to the **Local Server** tab (the `<->` icon on the left).
4.  Load your downloaded model at the top.
5.  In the right panel, under **Server Options**:
    *   Ensure the port is set to `1234`.
    *   Enable **CORS** (Cross-Origin Resource Sharing) so the extension can fetch data from it.
6.  Click **Start Server**.
7.  **In the Extension Settings**:
    *   Click **Add** next to the Active Provider.
    *   Select **OpenAI Compatible**.
    *   Name it "LM Studio".
    *   Set the Endpoint URL to: `http://localhost:1234/v1/chat/completions`
    *   *(Optional)* Enter `lm-studio` as the API key.
    *   Save and select it as your Active Provider!

### 2. Setting up llama.cpp (`llama-server`)

If you prefer the command line, [llama.cpp](https://github.com/ggerganov/llama.cpp) is a highly optimized C/C++ inference engine.

1.  Clone and build `llama.cpp` according to their repository instructions.
2.  Download a `.gguf` model file (e.g., from HuggingFace).
3.  Run the built-in `llama-server` executable and be sure to enable CORS:
    ```bash
    ./llama-server -m models/your-downloaded-model.gguf -c 2048 --port 8080 --host 127.0.0.1
    ```
    *(Note: To enable CORS in newer versions of llama-server, you may need to pass `--api-key` or specify explicit origins if it complains, but generally localhost requests from the browser will pass through if the extension runs them).*
4.  **In the Extension Settings**:
    *   Click **Add** next to the Active Provider.
    *   Select **OpenAI Compatible**.
    *   Name it "Llama.cpp Server".
    *   Set the Endpoint URL to: `http://localhost:8080/v1/chat/completions`
    *   Save and select it as your Active Provider!

### Using gemma.cpp

Because `gemma.cpp` is a lightweight standalone C++ engine, it does not ship with an out-of-the-box REST API server. To use Gemma models with this extension, simply download the Gemma GGUF weights and run them via **LM Studio** or **llama.cpp** as described above. Both engines fully support the Gemma architecture.