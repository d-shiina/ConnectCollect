import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BridgeApi, FlowDefinition, FlowEvent } from '../shared/types';

const bridge: BridgeApi = {
  listFlows: () => ipcRenderer.invoke('flows:list'),
  getFlow: (id: string) => ipcRenderer.invoke('flows:get', id),
  saveFlow: (flow: FlowDefinition) => ipcRenderer.invoke('flows:save', flow),
  deleteFlow: (id: string) => ipcRenderer.invoke('flows:delete', id),
  listAdapters: () => ipcRenderer.invoke('adapters:list'),
  getServerPort: () => ipcRenderer.invoke('server:port'),
  listPlugins: () => ipcRenderer.invoke('plugins:list'),
  setPluginEnabled: (name: string, enabled: boolean) =>
    ipcRenderer.invoke('plugins:setEnabled', name, enabled),
  openPluginDir: () => ipcRenderer.invoke('plugins:openDir'),
  credentialsHas: (scope: string, key: string) =>
    ipcRenderer.invoke('credentials:has', scope, key),
  credentialsSet: (scope: string, key: string, value: string) =>
    ipcRenderer.invoke('credentials:set', scope, key, value),
  credentialsDelete: (scope: string, key: string) =>
    ipcRenderer.invoke('credentials:delete', scope, key),
  oauthStart: (scope: string) => ipcRenderer.invoke('oauth:start', scope),
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
