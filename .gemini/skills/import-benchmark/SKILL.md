---
name: import-benchmark
description: Import a new benchmark file into the Cortex baselines. Use when the user wants to add a benchmark JSON file to the project's baselines index.
---

# Import Benchmark

Import a new benchmark file into the Cortex baselines.

## Usage

When the user invokes `/import-benchmark <path-to-file>` or asks to import a benchmark file, follow these steps:

### Step 1: Run the import script

Run the included Node.js script using the `run_shell_command` tool. Pass the path to the benchmark JSON file as the first argument.

```bash
node <path-to-skill>/scripts/import_benchmark.js "<path-to-benchmark-file>"
```

### Step 2: Handle missing engine (if applicable)

If the script outputs `ENGINE_REQUIRED`, it means the benchmark engine could not be determined from the file name. 

1. Ask the user which engine this benchmark is for (e.g., `litertlm`, `llminferenceengine`, or other).
2. Once the user provides the engine, re-run the script and pass the engine as the second argument:

```bash
node <path-to-skill>/scripts/import_benchmark.js "<path-to-benchmark-file>" "<engine>"
```

### Step 3: Report

The script will handle validating the file, constructing the proper filename, copying it to `webapp/public/data/baselines/`, and updating `index.json`.

After the script succeeds, tell the user the outcome by summarizing the script's output (e.g., which filename was used, whether it replaced an existing index entry or was added as new, and confirming the update).