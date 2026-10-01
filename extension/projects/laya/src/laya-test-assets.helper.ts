import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HF_BASE = 'https://huggingface.co/litert-community/laya-LiteRT/resolve/main';
const CACHE_DIR = join(process.cwd(), 'node_modules', '.cache', 'laya-test-assets');

/**
 * Downloads (once) and reads the tokenizer files a spec needs.
 * Returns null when the network is unavailable so the spec can skip.
 */
export async function loadLayaTestAsset(path: string): Promise<string | null> {
  const local = join(CACHE_DIR, path);
  if (existsSync(local)) {
    try {
      const content = readFileSync(local, 'utf8');
      JSON.parse(content);
      return content;
    } catch {
      try {
        unlinkSync(local);
      } catch {}
    }
  }
  try {
    const res = await fetch(`${HF_BASE}/${path}`);
    if (!res.ok) return null;
    const text = await res.text();
    mkdirSync(join(local, '..'), { recursive: true });
    const tmp = `${local}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, text);
    renameSync(tmp, local);
    return text;
  } catch {
    return null;
  }
}
