import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { ClassifierModelFileRole } from '../../base/src/lib/classifier/enums/classifier-model-file-role.enum';
import { ClassifierModelFile } from '../../base/src/lib/classifier/interfaces/classifier-model-file.interface';
import {
  classifierModelFileUrl,
  classifierModelTotalBytes,
} from '../../base/src/lib/classifier/registry/classifier-model-registry.utils';

const ROOT_DIR = 'classifier-models';
const SIZES_META_FILE = '.sizes.json';

/**
 * Caches model files in the extension's Origin Private File System.
 *
 * Layout: `classifier-models/<variantId>/<role>`. Completed downloads record
 * their actual byte length in `.sizes.json` (and are verified against the HTTP
 * `Content-Length` header during transfer), so minor upstream Hugging Face
 * re-exports do not break downloads while interrupted transfers still resume.
 */
export class ClassifierModelStore {
  private constructor(private readonly root: FileSystemDirectoryHandle) {}

  static async open(): Promise<ClassifierModelStore> {
    const opfs = await navigator.storage.getDirectory();
    const root = await opfs.getDirectoryHandle(ROOT_DIR, { create: true });
    return new ClassifierModelStore(root);
  }

  /** Bytes present for the variant and whether every file is complete. */
  async status(variant: ClassifierModelVariant): Promise<{ complete: boolean; cachedBytes: number }> {
    let cachedBytes = 0;
    let complete = true;
    const dir = await this.directory(variant.id, false);
    if (!dir) return { complete: false, cachedBytes: 0 };
    const recordedSizes = await this.readRecordedSizes(dir);
    for (const file of variant.files) {
      const size = await this.fileSize(dir, file.role);
      if (this.isFileComplete(size, file, recordedSizes)) cachedBytes += size;
      else complete = false;
    }
    return { complete, cachedBytes };
  }

  async download(
    variant: ClassifierModelVariant,
    onProgress: (loaded: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const dir = (await this.directory(variant.id, true))!;
    const total = classifierModelTotalBytes(variant);
    const recordedSizes = await this.readRecordedSizes(dir);
    let done = 0;

    for (const file of variant.files) {
      signal?.throwIfAborted();
      const existing = await this.fileSize(dir, file.role);
      if (this.isFileComplete(existing, file, recordedSizes)) {
        done += file.bytes;
        onProgress(Math.min(1, done / total));
        continue;
      }
      const received = await this.downloadFile(dir, variant, file, signal, (bytes) =>
        onProgress(Math.min(1, (done + Math.min(bytes, file.bytes)) / total)),
      );
      recordedSizes[file.role] = received;
      await this.writeRecordedSizes(dir, recordedSizes);
      done += file.bytes;
      onProgress(Math.min(1, done / total));
    }
  }

  async read(variant: ClassifierModelVariant, role: ClassifierModelFileRole): Promise<ArrayBuffer> {
    const dir = await this.directory(variant.id, false);
    if (!dir) throw new Error(`Model "${variant.id}" is not downloaded.`);
    const handle = await dir.getFileHandle(role);
    return (await handle.getFile()).arrayBuffer();
  }

  async readText(variant: ClassifierModelVariant, role: ClassifierModelFileRole): Promise<string> {
    return new TextDecoder().decode(await this.read(variant, role));
  }

  async delete(variant: ClassifierModelVariant): Promise<void> {
    try {
      await this.root.removeEntry(variant.id, { recursive: true });
    } catch (e) {
      if ((e as DOMException)?.name !== 'NotFoundError') throw e;
    }
  }

  private async downloadFile(
    dir: FileSystemDirectoryHandle,
    variant: ClassifierModelVariant,
    file: ClassifierModelFile,
    signal: AbortSignal | undefined,
    onBytes: (bytes: number) => void,
  ): Promise<number> {
    const response = await fetch(classifierModelFileUrl(variant, file), { signal });
    if (!response.ok || !response.body) {
      throw new DOMException(`Download of ${file.path} failed with HTTP ${response.status}.`, 'NetworkError');
    }
    const contentEncoding = response.headers.get('content-encoding');
    const contentLengthHeader = response.headers.get('content-length');
    const expectedFromHeader =
      !contentEncoding && contentLengthHeader ? Number(contentLengthHeader) : NaN;

    const handle = await dir.getFileHandle(file.role, { create: true });
    const writable = await handle.createWritable({ keepExistingData: false });
    const reader = response.body.getReader();
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        received += value.byteLength;
        onBytes(received);
      }
      await writable.close();
    } catch (e) {
      await writable.abort().catch(() => undefined);
      await dir.removeEntry(file.role).catch(() => undefined);
      throw e;
    }
    if (
      received <= 0 ||
      (Number.isFinite(expectedFromHeader) && expectedFromHeader > 0 && received !== expectedFromHeader)
    ) {
      await dir.removeEntry(file.role).catch(() => undefined);
      throw new DOMException(
        `Downloaded ${received} bytes for ${file.path}, expected ${
          Number.isFinite(expectedFromHeader) && expectedFromHeader > 0 ? expectedFromHeader : file.bytes
        }.`,
        'NetworkError',
      );
    }
    return received;
  }

  private isFileComplete(
    size: number,
    file: ClassifierModelFile,
    recordedSizes: Record<string, number>,
  ): boolean {
    if (size <= 0) return false;
    const recorded = recordedSizes[file.role];
    if (typeof recorded === 'number' && recorded > 0) {
      return size === recorded;
    }
    return size === file.bytes;
  }

  private async readRecordedSizes(dir: FileSystemDirectoryHandle): Promise<Record<string, number>> {
    try {
      const handle = await dir.getFileHandle(SIZES_META_FILE);
      const text = await (await handle.getFile()).text();
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async writeRecordedSizes(
    dir: FileSystemDirectoryHandle,
    sizes: Record<string, number>,
  ): Promise<void> {
    try {
      const handle = await dir.getFileHandle(SIZES_META_FILE, { create: true });
      const writable = await handle.createWritable({ keepExistingData: false });
      await writable.write(JSON.stringify(sizes));
      await writable.close();
    } catch {
      // Non-fatal metadata write failure
    }
  }

  private async directory(variantId: string, create: boolean): Promise<FileSystemDirectoryHandle | null> {
    try {
      return await this.root.getDirectoryHandle(variantId, { create });
    } catch (e) {
      if ((e as DOMException)?.name === 'NotFoundError') return null;
      throw e;
    }
  }

  private async fileSize(dir: FileSystemDirectoryHandle, role: string): Promise<number> {
    try {
      const handle = await dir.getFileHandle(role);
      return (await handle.getFile()).size;
    } catch {
      return -1;
    }
  }
}
