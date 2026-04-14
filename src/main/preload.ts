import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BridgeApi, FlowDefinition, FlowEvent } from '../shared/types';

const bridge: BridgeApi = {
  listFlows: () => ipcRenderer.invoke('flows:list'),
  getFlow: (id: string) => ipcRenderer.invoke('flows:get', id),
  saveFlow: (flow: FlowDefinition) => ipcRenderer.invoke('flows:save', flow),
  deleteFlow: (id: string) => ipcRenderer.invoke('flows:delete', id),
  listAdapters: () => ipcRenderer.invoke('adapters:list'),
  getServerPort: () => ipcRenderer.invoke('server:port'),
  onFlowEvent: (callback: (event: FlowEvent) => void) => {
    const listener = (_: IpcRendererEvent, event: FlowEvent): void =>
      callback(event);
    ipcRenderer.on('flow-event', listener);
    return () => {
      ipcRenderer.off('flow-event', listener);
    };
  },
};

contextBridge.exposeInMainWorld('bridge', bridge);
