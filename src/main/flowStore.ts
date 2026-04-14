import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { FlowDefinition } from '../shared/types';

/**
 * フロー定義 JSON をユーザーデータ領域に永続化するストア。
 * 保存先: app.getPath('userData') / flows / <flowId>.json
 */
class FlowStore {
  private cachedDir: string | null = null;

  private getDir(): string {
    if (this.cachedDir) return this.cachedDir;
    const dir = path.join(app.getPath('userData'), 'flows');
    this.cachedDir = dir;
    return dir;
  }

  private async ensureDir(): Promise<string> {
    const dir = this.getDir();
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private flowPath(id: string): string {
    // 単純なサニタイズ: パス区切り文字を禁止
    if (id.includes('/') || id.includes('\\') || id.includes('..')) {
      throw new Error(`invalid flow id: ${id}`);
    }
    return path.join(this.getDir(), `${id}.json`);
  }

  async listFlows(): Promise<FlowDefinition[]> {
    const dir = await this.ensureDir();
    const files = await fs.readdir(dir);
    const flows: FlowDefinition[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        flows.push(JSON.parse(raw) as FlowDefinition);
      } catch (err) {
        console.error(`[flowStore] failed to read ${file}`, err);
      }
    }
    return flows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getFlow(id: string): Promise<FlowDefinition | null> {
    await this.ensureDir();
    try {
      const raw = await fs.readFile(this.flowPath(id), 'utf-8');
      return JSON.parse(raw) as FlowDefinition;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async saveFlow(flow: FlowDefinition): Promise<FlowDefinition> {
    await this.ensureDir();
    const now = new Date().toISOString();
    const toSave: FlowDefinition = {
      ...flow,
      createdAt: flow.createdAt || now,
      updatedAt: now,
    };
    await fs.writeFile(
      this.flowPath(flow.id),
      JSON.stringify(toSave, null, 2),
      'utf-8',
    );
    return toSave;
  }

  async deleteFlow(id: string): Promise<void> {
    try {
      await fs.unlink(this.flowPath(id));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
}

export const flowStore = new FlowStore();
