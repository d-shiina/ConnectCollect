import { Router, type Request, type Response } from 'express';
import { flowStore } from './flowStore';
import { executeFlow } from './flowEngine';
import type { FlowDefinition, FlowRunRequest } from '../shared/types';

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

  router.post('/flows/:id/run', async (req, res) => {
    try {
      const flow = await flowStore.getFlow(req.params.id);
      if (!flow) {
        res.status(404).json({ error: 'flow not found' });
        return;
      }
      const body = (req.body ?? {}) as FlowRunRequest;
      const result = await executeFlow(flow, body.inputs ?? {});
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
  });

  return router;
}
