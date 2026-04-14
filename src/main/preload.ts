import { contextBridge, ipcRenderer } from 'electron';
import type { BridgeApi, FlowDefinition } from '../shared/types';

const bridge: BridgeApi = {
  listFlows: () => ipcRenderer.invoke('flows:list'),
  getFlow: (id: string) => ipcRenderer.invoke('flows:get', id),
  saveFlow: (flow: FlowDefinition) => ipcRenderer.invoke('flows:save', flow),
  deleteFlow: (id: string) => ipcRenderer.invoke('flows:delete', id),
  listAdapters: () => ipcRenderer.invoke('adapters:list'),
  getServerPort: () => ipcRenderer.invoke('server:port'),
};

contextBridge.exposeInMainWorld('bridge', bridge);
