import { contextBridge } from 'electron';

/**
 * Renderer に公開する API。
 *
 * Step 2 時点ではバージョン情報のみ。Step 5 で window.api.rpc(method, params)
 * を生やして Python agent と通信できるようにする。
 */
contextBridge.exposeInMainWorld('api', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
