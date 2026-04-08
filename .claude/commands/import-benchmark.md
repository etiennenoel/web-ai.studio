# Import Benchmark

Import a new benchmark file into the Cortex baselines.

## Usage

The user provides a path to a benchmark JSON file (absolute or relative). This skill:

1. Copies the file into `webapp/public/data/baselines/`
2. Updates `webapp/public/data/baselines/index.json` to point to the new file
3. If an older benchmark with the same hardware+engine combination already exists in the index, the old file is kept on disk but the index entry is replaced to point to the new file

## Instructions

When the user invokes `/import-benchmark <path-to-file>`, follow these steps:

### Step 1: Read and validate the benchmark file

Read the file at the path provided by the user (argument: `$ARGUMENTS`). Validate that it has the expected structure:
- `timestamp` (string)
- `hardware` object with `cpu.modelName` and `memory.capacity`
- `results` object with `testsResults` array

If the file is invalid, inform the user and stop.

### Step 2: Determine the filename

The benchmark filename (without `.json`) follows this convention based on existing files:

**For on-device benchmarks** (have `hardware.cpu.modelName`):
- Pattern: `{date}-{os}-{cpu-slug}-{ram}gb-{engine}`
- `{date}`: extracted from `timestamp`, formatted as `YYYY-MM-DD`
- `{os}`: determined from `userAgent` — "apple" in the user agent means `macOS`, "Windows" means `windows`, "Linux" means `linux`. Use lowercase except for specific CPU brand names. Look at existing filenames for reference.
- `{cpu-slug}`: derived from `hardware.cpu.modelName`, lowercased, spaces replaced with `-`. For Apple chips like "Apple M4 Max", use `apple-m4-max`. For Intel/AMD, use the model like `i7-13800H` or `AMD-7985WX`.
- `{ram}`: `hardware.memory.capacity` converted from bytes to GB (divide by 1073741824, round to nearest integer)
- `{engine}`: derived from the filename the user gives, or ask the user. Common values: `litertlm`, `llminferenceengine`. If the user's original filename contains the engine, use that.

**For cloud benchmarks** (no meaningful hardware info, `executionType` would be "Cloud"):
- Pattern: `{date}_{model_name}` with spaces replaced by underscores and lowercased

If the engine cannot be determined from the source filename, **ask the user** which engine this benchmark is for (e.g., `litertlm`, `llminferenceengine`, or other).

### Step 3: Copy the file

Copy the benchmark JSON file to `webapp/public/data/baselines/{filename}.json`.

### Step 4: Build the index entry

Create an index entry object with these fields:
- `filename`: the filename without `.json`
- `name`: a human-readable name. For on-device: `"{cpu} ({engine-label})"` where engine-label is derived as: `llminferenceengine` -> `LLM IE`, `litertlm` -> `LiteRT-LM`, otherwise use the engine value. For cloud: use the model name.
- `os`: `macOS`, `Linux`, `Windows`, or `Cloud`
- `cpu`: the CPU model name from `hardware.cpu.modelName` (for on-device)
- `ram`: RAM in GB (for on-device)
- `model`: `Nano V3 4B` for on-device, or the cloud model name for cloud
- `executionType`: `GPU` for on-device, `Cloud` for cloud

### Step 5: Update index.json

Read `webapp/public/data/baselines/index.json`.

Check if there is an existing entry with the **same hardware+engine combination**. The match criteria:
- Same `cpu` value (or same `name` for cloud)
- Same `ram` value
- Same engine (derived from filename: both contain `llminferenceengine`, or both contain `litertlm`, etc.)

If a match is found:
- **Keep the old file on disk** (do NOT delete it)
- **Replace** the old entry in the index array with the new entry

If no match is found:
- **Append** the new entry to the index array

Write the updated index back to `webapp/public/data/baselines/index.json` with 2-space indentation.

### Step 6: Report

Tell the user:
- The filename used
- Whether it replaced an existing index entry (and which one) or was added as new
- Confirm the file was copied and index was updated
