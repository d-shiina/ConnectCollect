import type {
  Adapter,
  AdapterConfig,
  AdapterExecutionContext,
  AdapterInput,
  AdapterOutput,
} from './base';
import type { AdapterMetadata } from '../../shared/types';

const metadata: AdapterMetadata = {
  name: 'box',
  displayName: 'Box',
  description:
    'Box へのファイル操作。現状は Developer Token モードで listFolder のみ対応。',
  configSchema: [
    {
      key: 'action',
      label: 'アクション',
      type: 'string',
      required: true,
      placeholder: 'listFolder',
    },
    {
      key: 'folderId',
      label: 'フォルダ ID',
      type: 'string',
      required: false,
      placeholder: '0 (=ルート)',
    },
  ],
  credentialSchema: [
    {
      key: 'devToken',
      label: 'Developer Token',
      type: 'password',
      required: true,
      placeholder: 'Box Developer Console で発行した 60 分有効なトークン',
    },
  ],
};

type BoxItem = {
  type: 'file' | 'folder' | 'web_link';
  id: string;
  name: string;
  size?: number;
};

type BoxListResponse = {
  total_count: number;
  entries: BoxItem[];
  limit: number;
  offset: number;
};

async function boxFetch(
  path: string,
  token: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`https://api.box.com/2.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  return { ok: res.ok, status: res.status, body };
}

export const boxAdapter: Adapter = {
  name: 'box',
  metadata,

  async execute(
    config: AdapterConfig,
    input: AdapterInput,
    ctx: AdapterExecutionContext,
  ): Promise<AdapterOutput> {
    // トークン取得: まず credentialStore、config に devToken があれば上書き保存
    let token = await ctx.credentials.get<string>('devToken');
    const configToken =
      typeof config.devToken === 'string' ? config.devToken : '';
    if (configToken) {
      token = configToken;
      await ctx.credentials.set('devToken', configToken);
      ctx.log('warn', 'Box: config.devToken を受け取ったので credentialStore に保存しました (次回からは config から消して OK)');
    }
    if (!token) {
      return {
        success: false,
        error:
          'Box の Developer Token が未設定です。プラグイン管理パネルから登録してください。',
      };
    }

    const action =
      (typeof config.action === 'string' && config.action) ||
      (typeof input.action === 'string' && input.action) ||
      'listFolder';

    switch (action) {
      case 'listFolder': {
        const folderId =
          (typeof config.folderId === 'string' && config.folderId) ||
          (typeof input.folderId === 'string' && input.folderId) ||
          '0';
        ctx.log('info', `Box: GET /folders/${folderId}/items`);
        const res = await boxFetch(
          `/folders/${encodeURIComponent(folderId)}/items?limit=100`,
          token,
        );
        if (!res.ok) {
          return {
            success: false,
            error: `Box API ${res.status}: ${JSON.stringify(res.body)}`,
          };
        }
        const data = res.body as BoxListResponse;
        ctx.log(
          'info',
          `Box: ${data.total_count} 件見つかりました (先頭 ${data.entries?.length ?? 0} 件)`,
        );
        return {
          success: true,
          data: {
            folderId,
            totalCount: data.total_count,
            entries: data.entries,
          },
        };
      }

      default:
        return {
          success: false,
          error: `サポートされていない action: ${action} (現状 listFolder のみ)`,
        };
    }
  },
};
