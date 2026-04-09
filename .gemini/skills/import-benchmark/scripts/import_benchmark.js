const fs = require('fs');
const path = require('path');

// Usage: node import_benchmark.js <path-to-json> [engine]

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Error: Please provide the path to the benchmark JSON file.");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);
let engineFromArg = args[1];

if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found at ${filePath}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (e) {
  console.error("Error: Failed to parse JSON file.");
  process.exit(1);
}

if (!data.timestamp || !data.results || !data.results.testsResults) {
  console.error("Error: Invalid benchmark file structure. Missing timestamp or results.");
  process.exit(1);
}

const isCloud = !data.hardware || !data.hardware.cpu || !data.hardware.cpu.modelName;

let filename = "";
let indexEntry = {};

if (isCloud) {
  if (!data.model) {
    console.error("Error: Cloud benchmark must have a model name.");
    process.exit(1);
  }
  const dateStr = data.timestamp.split('T')[0];
  const modelSlug = data.model.toLowerCase().replace(/\s+/g, '_');
  filename = `${dateStr}_${modelSlug}`;

  indexEntry = {
    filename,
    name: data.model,
    os: "Cloud",
    cpu: "",
    ram: 0,
    model: data.model,
    executionType: "Cloud"
  };
} else {
  // On-device
  if (!data.hardware || !data.hardware.cpu || !data.hardware.cpu.modelName || !data.hardware.memory || !data.hardware.memory.capacity) {
    console.error("Error: On-device benchmark must have hardware.cpu.modelName and hardware.memory.capacity.");
    process.exit(1);
  }

  const dateStr = data.timestamp.split('T')[0];
  
  let os = "unknown";
  if (data.userAgent) {
    const ua = data.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      os = "windows";
    } else if (ua.includes("mac os") || ua.includes("macintosh")) {
      os = "macOS";
    } else if (ua.includes("linux")) {
      os = "linux";
    }
  }

  let rawCpuName = data.hardware.cpu.modelName;
  let cleanCpuName = rawCpuName;
  let cpuSlug = rawCpuName.toLowerCase().replace(/\s+/g, '-');

  if (rawCpuName.includes("Intel(R) Core(TM)")) {
    const match = rawCpuName.match(/(i\d-\d+[A-Z]+)/);
    if (match) {
      cleanCpuName = `Intel Core ${match[1]}`;
      cpuSlug = match[1].toLowerCase();
    }
  } else if (rawCpuName.includes("AMD")) {
    const match = rawCpuName.match(/AMD\s+([A-Za-z0-9-]+)/i);
    if (match) {
      cleanCpuName = `AMD ${match[1]}`;
      cpuSlug = `amd-${match[1].toLowerCase()}`;
    }
  }

  let ramGb = Math.round(data.hardware.memory.capacity / 1073741824);

  let engine = engineFromArg;
  if (!engine) {
    const lowerFilename = path.basename(filePath).toLowerCase();
    if (lowerFilename.includes('litertlm')) engine = 'litertlm';
    else if (lowerFilename.includes('llminferenceengine') || lowerFilename.includes('llmie')) engine = 'llminferenceengine';
  }

  if (!engine) {
    console.error("ENGINE_REQUIRED");
    process.exit(1);
  }
  
  engine = engine.toLowerCase();

  filename = `${dateStr}-${os.toLowerCase()}-${cpuSlug}-${ramGb}gb-${engine}`;

  let engineLabel = engine;
  if (engine === 'llminferenceengine') engineLabel = 'LLM IE';
  else if (engine === 'litertlm') engineLabel = 'LiteRT-LM';

  indexEntry = {
    filename,
    name: `${cleanCpuName} (${engineLabel})`,
    os: os === "macOS" ? "macOS" : (os === "windows" ? "Windows" : (os === "linux" ? "Linux" : "Unknown")),
    cpu: cleanCpuName,
    ram: ramGb,
    model: "Nano V3 4B",
    executionType: "GPU"
  };
}

const targetDir = path.resolve(process.cwd(), 'webapp/public/data/baselines');
if (!fs.existsSync(targetDir)) {
  console.error(`Error: target directory ${targetDir} does not exist. Please run this script from the project root.`);
  process.exit(1);
}

const targetFilePath = path.join(targetDir, `${filename}.json`);
fs.copyFileSync(filePath, targetFilePath);

const indexPath = path.join(targetDir, 'index.json');
let indexData = [];
if (fs.existsSync(indexPath)) {
  try {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    console.error("Error: Failed to parse index.json");
    process.exit(1);
  }
}

// Find existing match
let matchIndex = -1;
for (let i = 0; i < indexData.length; i++) {
  const entry = indexData[i];
  if (isCloud) {
    if (entry.name === indexEntry.name && entry.executionType === "Cloud") {
      matchIndex = i;
      break;
    }
  } else {
    // Match logic: same cpu, same ram, same engine
    let entryEngine = "";
    if (entry.filename.includes('litertlm')) entryEngine = 'litertlm';
    else if (entry.filename.includes('llminferenceengine')) entryEngine = 'llminferenceengine';
    else entryEngine = entry.filename.split('-').pop(); // fallback

    let newEngine = "";
    if (filename.includes('litertlm')) newEngine = 'litertlm';
    else if (filename.includes('llminferenceengine')) newEngine = 'llminferenceengine';
    else newEngine = engineFromArg || engine;

    if (entry.cpu === indexEntry.cpu && entry.ram === indexEntry.ram && entryEngine === newEngine && entry.executionType === "GPU") {
      matchIndex = i;
      break;
    }
  }
}

if (matchIndex !== -1) {
  const oldEntry = indexData[matchIndex];
  indexData[matchIndex] = indexEntry;
  console.log(`Replaced existing entry for ${indexEntry.name} (was ${oldEntry.filename}.json, now ${indexEntry.filename}.json)`);
} else {
  indexData.push(indexEntry);
  console.log(`Added new entry for ${indexEntry.name}`);
}

fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2) + '\n', 'utf8');
console.log(`Successfully copied benchmark to webapp/public/data/baselines/${filename}.json and updated index.json`);
