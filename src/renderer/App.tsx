import React, { useCallback, useEffect, useState } from 'react';
import {
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { FlowCanvas, applyAdapterStatus } from './components/FlowCanvas';
import { NodePanel } from './components/NodePanel';
import { LogPanel } from './components/LogPanel';
import { Toolbar } from './components/Toolbar';
import type { AppNode } from './nodes/types';
import type {
  AdapterMetadata,
  FlowDefinition,
  FlowNode as FlowNodeDef,
  FlowRunResult,
  LogEntry,
  NodeType,
} from '../shared/types';

const SAMPLE_FLOW_ID = 'sample-flow';

const initialNodes: AppNode[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 80, y: 160 },
    data: { label: 'WinActor Trigger' },
  },
  {
    id: 'adapter-1',
    type: 'adapter',
    position: { x: 360, y: 160 },
    data: {
      label: 'kintone 検索',
      adapterType: 'kintone',
      config: { appId: '123', apiToken: 'demo-token' },
      status: 'idle',
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'trigger-1', target: 'adapter-1' },
];

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [adapters, setAdapters] = useState<AdapterMetadata[]>([]);
  const [running, setRunning] = useState(false);
  const [flowId] = useState<string>(SAMPLE_FLOW_ID);
  const [flowName] = useState<string>('サンプルフロー');
  const [serverPort, setServerPort] = useState<number>(8765);

  useEffect(() => {
    window.bridge?.listAdapters().then(setAdapters).catch(() => setAdapters([]));
    window.bridge?.getServerPort().then(setServerPort).catch(() => undefined);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) =>
      setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((es) => addEdge(connection, es)),
    [],
  );

  const appendLog = (entry: LogEntry): void => {
    setLogs((prev) => [...prev, entry]);
  };

  const buildFlowDefinition = (): FlowDefinition => {
    const now = new Date().toISOString();
    const flowNodes: FlowNodeDef[] = nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? 'transform') as NodeType,
      position: n.position,
      data: {
        label: n.data.label,
        adapterType: 'adapterType' in n.data ? n.data.adapterType : undefined,
        config: 'config' in n.data ? n.data.config : undefined,
      },
    }));
    return {
      id: flowId,
      name: flowName,
      nodes: flowNodes,
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleSave = async (): Promise<void> => {
    try {
      const flow = buildFlowDefinition();
      await window.bridge.saveFlow(flow);
      appendLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `フロー "${flow.name}" を保存しました`,
      });
    } catch (err) {
      appendLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `保存に失敗: ${(err as Error).message}`,
      });
    }
  };

  const resetAdapterStatuses = (): void => {
    setNodes((ns) =>
      ns.map((n) =>
        n.type === 'adapter'
          ? { ...n, data: { ...n.data, status: 'running' as const } }
          : n,
      ),
    );
  };

  const handleRun = async (): Promise<void> => {
    setRunning(true);
    resetAdapterStatuses();

    try {
      const flow = buildFlowDefinition();
      await window.bridge.saveFlow(flow);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/flows/${flow.id}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: { query: 'status = active' } }),
        },
      );
      const result = (await res.json()) as FlowRunResult;
      setLogs((prev) => [...prev, ...result.logs]);

      setNodes((ns) => {
        let next = ns;
        for (const log of result.logs) {
          if (log.nodeId && log.level === 'error') {
            next = applyAdapterStatus(next, log.nodeId, 'error');
          }
        }
        if (result.success) {
          next = next.map((n) =>
            n.type === 'adapter' && n.data.status !== 'error'
              ? { ...n, data: { ...n.data, status: 'success' as const } }
              : n,
          );
        }
        return next;
      });
    } catch (err) {
      appendLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `実行に失敗: ${(err as Error).message}`,
      });
      setNodes((ns) =>
        ns.map((n) =>
          n.type === 'adapter'
            ? { ...n, data: { ...n.data, status: 'error' as const } }
            : n,
        ),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="app">
      <Toolbar
        flowName={flowName}
        onSave={handleSave}
        onRun={handleRun}
        running={running}
      />
      <NodePanel adapters={adapters} />
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      />
      <LogPanel logs={logs} />
    </div>
  );
};
