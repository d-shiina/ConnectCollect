import type {
  Adapter,
  AdapterConfig,
  AdapterExecutionContext,
  AdapterInput,
  AdapterOutput,
} from './base';
import type { AdapterMetadata } from '../../shared/types';
import { refreshOAuthToken } from '../oauth';

const BOX_AUTH = {
  type: 'oauth2' as const,
  authorizeUrl: 'https://account.box.com/api/oauth2/authorize',
  tokenUrl: 'https://api.box.com/oauth2/token',
  scopes: ['root_readwrite'],
};

const metadata: AdapterMetadata = {
  name: 'box',
  displayName: 'Box',
  description:
    'Box へのファイル操作 (OAuth 2.0)。現状は listFolder のみ実装。',
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
  auth: BOX_AUTH,
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
    let token = await ctx.credentials.get<string>('accessToken');
    if (!token) {
      return {
        success: false,
        error:
          'Box の access token がありません。プラグイン管理パネルの「Box に接続」から OAuth 認証してください。',
      };
    }

    const action =
      (typeof config.action === 'string' && config.action) ||
      (typeof input.action === 'string' && input.action) ||
      'listFolder';

    const run = async (): Promise<AdapterOutput> => {
      switch (action) {
        case 'listFolder': {
          const folderId =
            (typeof config.folderId === 'string' && config.folderId) ||
            (typeof input.folderId === 'string' && input.folderId) ||
            '0';
          ctx.log('info', `Box: GET /folders/${folderId}/items`);
          const res = await boxFetch(
            `/folders/${encodeURIComponent(folderId)}/items?limit=100`,
            token as string,
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
    };

    let result = await run();

    // 401 を検出したら refresh token で自動更新して 1 回だけリトライ
    if (
      !result.success &&
      result.error &&
      result.error.startsWith('Box API 401')
    ) {
      ctx.log('warn', 'Box: 401 を受信、refresh token で再認証を試みます');
      const refreshed = await refreshOAuthToken('box', BOX_AUTH);
      if (!refreshed.success) {
        return {
          success: false,
          error: `Box token refresh 失敗: ${refreshed.error ?? 'unknown'}。再認証してください。`,
        };
      }
      token = await ctx.credentials.get<string>('accessToken');
      if (!token) {
        return { success: false, error: 'refresh 後に accessToken が取得できませんでした' };
      }
      ctx.log('info', 'Box: token を更新しました、リトライします');
      result = await run();
    }

    return result;
  },
};
