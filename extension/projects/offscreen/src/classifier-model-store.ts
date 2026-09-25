import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { ClassifierModelFileRole } from '../../base/src/lib/classifier/enums/classifier-model-file-role.enum';
import { ClassifierModelFile } from '../../base/src/lib/classifier/interfaces/classifier-model-file.interface';
import {
  classifierModelFileUrl,
  classifierModelTotalBytes,
} from '../../base/src/lib/classifier/registry/classifier-model-registry.utils';

const ROOT_DIR = 'classifier-models';

/**
 * Caches model files in the extension's Origin Private File System.
 *
 * Layout: `classifier-models/<variantId>/<role>`. A file is complete when its
 * size equals the registry's byte count, so an interrupted download resumes
 * by re-fetching only the incomplete files.
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
    for (const file of variant.files) {
      const size = await this.fileSize(dir, file.role);
      if (size === file.bytes) cachedBytes += size;
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
    let done = 0;

    for (const file of variant.files) {
      signal?.throwIfAborted();
      const existing = await this.fileSize(dir, file.role);
      if (existing === file.bytes) {
        done += file.bytes;
        onProgress(done / total);
        continue;
      }
      await this.downloadFile(dir, variant, file, signal, (bytes) => onProgress((done + bytes) / total));
      done += file.bytes;
      onProgress(done / total);
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
  ): Promise<void> {
    const response = await fetch(classifierModelFileUrl(variant, file), { signal });
    if (!response.ok || !response.body) {
      throw new DOMException(`Download of ${file.path} failed with HTTP ${response.status}.`, 'NetworkError');
    }
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
      throw e;
    }
    if (received !== file.bytes) {
      await dir.removeEntry(file.role).catch(() => undefined);
      throw new DOMException(
        `Downloaded ${received} bytes for ${file.path}, expected ${file.bytes}.`,
        'NetworkError',
      );
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
