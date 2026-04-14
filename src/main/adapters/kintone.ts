import type {
  Adapter,
  AdapterConfig,
  AdapterExecutionContext,
  AdapterInput,
  AdapterOutput,
} from './base';
import type { AdapterMetadata } from '../../shared/types';

interface KintoneRecord {
  id: string;
  title: string;
}

const metadata: AdapterMetadata = {
  name: 'kintone',
  displayName: 'kintone',
  description: 'サイボウズ kintone へのレコード検索・登録 (現在はダミー実装)',
  configSchema: [
    {
      key: 'appId',
      label: 'App ID',
      type: 'string',
      required: true,
      placeholder: '123',
    },
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const kintoneAdapter: Adapter = {
  name: 'kintone',
  metadata,

  async execute(
    config: AdapterConfig,
    input: AdapterInput,
    _ctx: AdapterExecutionContext,
  ): Promise<AdapterOutput> {
    const apiToken = typeof config.apiToken === 'string' ? config.apiToken : '';
    const appId = typeof config.appId === 'string' ? config.appId : '';

    if (!apiToken) {
      return {
        success: false,
        error: 'kintone apiToken が設定されていません',
      };
    }

    // 非同期感を出すためのダミー遅延
    await sleep(500);

    const query = typeof input.query === 'string' ? input.query : '';
    const records: KintoneRecord[] = [
      { id: '1', title: `サンプルレコード (app=${appId || 'n/a'})` },
    ];

    return {
      success: true,
      data: {
        records,
        matchedQuery: query,
      },
    };
  },
};
