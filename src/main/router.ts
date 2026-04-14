import { Router, type Request, type Response } from 'express';
import { flowStore } from './flowStore';
import { executeFlow } from './flowEngine';
import type { FlowDefinition } from '../shared/types';

/**
 * query string / form-urlencoded / JSON body の 3 系統から
 * フラットな inputs オブジェクトを組み立てる。
 *
 * 優先順位 (上書きしていく順):
 *   1. req.query                         (URL クエリ: ?key=val)
 *   2. req.body がフラットオブジェクト  (form-urlencoded または JSON の平置き)
 *   3. req.body.inputs                   (従来の JSON 形式 {inputs:{...}})
 *
 * 上位の値が下位を上書きする (後勝ち)。
 */
function buildInputs(
  query: unknown,
  body: unknown,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  if (query && typeof query === 'object') {
    Object.assign(merged, query as Record<string, unknown>);
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    // inputs キー以外は "フラット inputs" として扱う
    for (const [k, v] of Object.entries(b)) {
      if (k === 'inputs') continue;
      merged[k] = v;
    }
    // inputs キーがあれば最優先で上書き
    if (
      'inputs' in b &&
      b.inputs &&
      typeof b.inputs === 'object' &&
      !Array.isArray(b.inputs)
    ) {
      Object.assign(merged, b.inputs as Record<string, unknown>);
    }
  }

  return merged;
}

export function createRouter(version: string): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version });
  });

  router.get('/flows', async (_req, res) => {
    try {
      const flows = await flowStore.listFlows();
      res.json(flows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/flows', async (req, res) => {
    try {
      const flow = req.body as FlowDefinition;
      if (!flow || !flow.id) {
        res.status(400).json({ error: 'flow.id is required' });
        return;
      }
      const saved = await flowStore.saveFlow(flow);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/flows/:id', async (req, res) => {
    try {
      const flow = await flowStore.getFlow(req.params.id);
      if (!flow) {
        res.status(404).json({ error: 'flow not found' });
        return;
      }
      res.json(flow);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST も GET もどちらでも受けて、WinActor の呼びやすさを最大化する
  const runHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const flow = await flowStore.getFlow(req.params.id);
      if (!flow) {
        res.status(404).json({ error: 'flow not found' });
        return;
      }
      const inputs = buildInputs(req.query, req.body);
      const result = await executeFlow(flow, inputs);
      // 実行失敗でも 200 で返す (仕様: 500 にしない)
      res.status(200).json(result);
    } catch (err) {
      res.status(200).json({
        success: false,
        flowId: req.params.id,
        error: (err as Error).message,
        executedAt: new Date().toISOString(),
        logs: [],
      });
    }
  };

  router.post('/flows/:id/run', runHandler);
  router.get('/flows/:id/run', runHandler);

  return router;
}
