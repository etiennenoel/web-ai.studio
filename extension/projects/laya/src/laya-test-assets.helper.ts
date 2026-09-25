import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HF_BASE = 'https://huggingface.co/litert-community/laya-LiteRT/resolve/main';
const CACHE_DIR = join(process.cwd(), 'node_modules', '.cache', 'laya-test-assets');

/**
 * Downloads (once) and reads the tokenizer files a spec needs.
 * Returns null when the network is unavailable so the spec can skip.
 */
export async function loadLayaTestAsset(path: string): Promise<string | null> {
  const local = join(CACHE_DIR, path);
  if (existsSync(local)) return readFileSync(local, 'utf8');
  try {
    const res = await fetch(`${HF_BASE}/${path}`);
    if (!res.ok) return null;
    const text = await res.text();
    mkdirSync(join(local, '..'), { recursive: true });
    writeFileSync(local, text);
    return text;
  } catch {
    return null;
  }
}
