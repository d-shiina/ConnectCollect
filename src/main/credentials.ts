import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * プラグイン (アダプタ) が使う認証情報を暗号化して保存するストア。
 *
 * - 保存先: app.getPath('userData') / credentials / <scope>.json
 * - 暗号化: Electron safeStorage (macOS=Keychain / Windows=DPAPI / Linux=libsecret)
 * - safeStorage が使えない環境では警告を出しつつ平文 JSON に fallback
 * - アダプタには scope (= adapter.name) を固定した ScopedCredentials を渡す
 */
export interface ScopedCredentials {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  has(key: string): Promise<boolean>;
}

interface StoredData {
  _encrypted: boolean;
  /** encrypted: base64 文字列 / plain: object */
  payload: string | Record<string, unknown>;
}

class CredentialStore {
  private cache = new Map<string, Record<string, unknown>>();

  private getDir(): string {
    return path.join(app.getPath('userData'), 'credentials');
  }

  private filePath(scope: string): string {
    if (scope.includes('/') || scope.includes('\\') || scope.includes('..')) {
      throw new Error(`invalid scope: ${scope}`);
    }
    return path.join(this.getDir(), `${scope}.json`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.getDir(), { recursive: true });
  }

  private async load(scope: string): Promise<Record<string, unknown>> {
    const cached = this.cache.get(scope);
    if (cached) return cached;
    await this.ensureDir();
    try {
      const raw = await fs.readFile(this.filePath(scope), 'utf-8');
      const parsed = JSON.parse(raw) as StoredData;
      let map: Record<string, unknown>;
      if (parsed._encrypted) {
        if (!safeStorage.isEncryptionAvailable()) {
          console.warn(
            `[credentials] cannot decrypt ${scope} (encryption unavailable on this OS)`,
          );
          map = {};
        } else {
          const decrypted = safeStorage.decryptString(
            Buffer.from(parsed.payload as string, 'base64'),
          );
          map = JSON.parse(decrypted) as Record<string, unknown>;
        }
      } else {
        map = (parsed.payload ?? {}) as Record<string, unknown>;
      }
      this.cache.set(scope, map);
      return map;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        const map: Record<string, unknown> = {};
        this.cache.set(scope, map);
        return map;
      }
      throw err;
    }
  }

  private async save(
    scope: string,
    map: Record<string, unknown>,
  ): Promise<void> {
    await this.ensureDir();
    let stored: StoredData;
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(JSON.stringify(map));
      stored = {
        _encrypted: true,
        payload: encrypted.toString('base64'),
      };
    } else {
      console.warn(
        `[credentials] writing plain credentials for ${scope} (encryption unavailable)`,
      );
      stored = { _encrypted: false, payload: map };
    }
    await fs.writeFile(
      this.filePath(scope),
      JSON.stringify(stored, null, 2),
      'utf-8',
    );
    this.cache.set(scope, map);
  }

  async get<T = unknown>(scope: string, key: string): Promise<T | null> {
    const map = await this.load(scope);
    return (map[key] as T | undefined) ?? null;
  }

  async set(scope: string, key: string, value: unknown): Promise<void> {
    const map = await this.load(scope);
    map[key] = value;
    await this.save(scope, map);
  }

  async delete(scope: string, key: string): Promise<void> {
    const map = await this.load(scope);
    delete map[key];
    await this.save(scope, map);
  }

  async list(scope: string): Promise<string[]> {
    const map = await this.load(scope);
    return Object.keys(map);
  }

  async has(scope: string, key: string): Promise<boolean> {
    const value = await this.get(scope, key);
    return value !== null && value !== undefined && value !== '';
  }

  scoped(scope: string): ScopedCredentials {
    return {
      get: <T = unknown>(key: string) => this.get<T>(scope, key),
      set: (key: string, value: unknown) => this.set(scope, key, value),
      delete: (key: string) => this.delete(scope, key),
      list: () => this.list(scope),
      has: (key: string) => this.has(scope, key),
    };
  }
}

export const credentialStore = new CredentialStore();
