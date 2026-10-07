import fs from 'node:fs/promises';
import path from 'node:path';

import type { ObjectStorage } from './object-storage';

export class LocalObjectStorage implements ObjectStorage {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  private resolveKey(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new Error('Invalid storage key');
    }
    return path.join(this.rootDir, normalized);
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const filePath = this.resolveKey(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        return;
      }
      throw err;
    }
  }

  publicUrl(key: string): string {
    const encoded = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${encoded}`;
  }
}
