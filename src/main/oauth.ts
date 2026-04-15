import { BrowserWindow } from 'electron';
import type { Request, Response } from 'express';
import type { PluginAuthMethod } from '../shared/types';
import { credentialStore } from './credentials';
import { getServerPort } from './server';

/**
 * OAuth 2.0 (認可コードフロー) の共通ヘルパ。
 *
 * アダプタの metadata.auth に宣言された情報を元に、
 * BrowserWindow で authorize URL を開き、Express に用意された
 * コールバックで code を捕捉 → token 交換 → credentialStore に保存 する。
 */

interface PendingFlow {
  scope: string;
  state: string;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  window: BrowserWindow;
}

const pendingFlows = new Map<string, PendingFlow>();

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function defaultKey(key: string | undefined, fallback: string): string {
  return key ?? fallback;
}

/** リダイレクト URI をコールバックパスから組み立てる */
export function redirectUriFor(
  scope: string,
  method: Extract<PluginAuthMethod, { type: 'oauth2' }>,
): string {
  const path = method.redirectPath ?? `/oauth/${scope}/callback`;
  const port = getServerPort();
  return `http://127.0.0.1:${port}${path}`;
}

/**
 * Express のルータに組み込むコールバックハンドラ。
 * 任意の scope のリクエストを一手に受けて pending に紐付ける。
 */
export function handleOAuthCallback(req: Request, res: Response): void {
  const scope = req.params.scope;
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const errorDesc =
    typeof req.query.error_description === 'string'
      ? req.query.error_description
      : typeof req.query.error === 'string'
        ? req.query.error
        : '';

  const pending = pendingFlows.get(scope);
  if (!pending) {
    res
      .status(400)
      .send('No pending OAuth flow for this scope. You can close this tab.');
    return;
  }
  if (pending.state !== state) {
    res.status(400).send('state mismatch');
    pending.reject(new Error('OAuth state mismatch'));
    pendingFlows.delete(scope);
    return;
  }
  if (!code) {
    res.status(400).send(`OAuth error: ${errorDesc || 'no code'}`);
    pending.reject(new Error(`OAuth error: ${errorDesc || 'no code'}`));
    pendingFlows.delete(scope);
    return;
  }

  res
    .status(200)
    .send(
      '<html><body style="font-family:sans-serif;padding:32px"><h2>認証が完了しました</h2><p>このタブは閉じて構いません。</p><script>window.close()</script></body></html>',
    );
  pending.resolve(code);
  pendingFlows.delete(scope);
}

/**
 * OAuth フローを開始する。
 * 1. Client ID / Secret を credentialStore から取得
 * 2. BrowserWindow で authorize URL を開く
 * 3. handleOAuthCallback から code を受け取るまで待機
 * 4. token_url に POST して access / refresh を交換
 * 5. credentialStore に保存
 */
export async function startOAuthFlow(
  scope: string,
  method: Extract<PluginAuthMethod, { type: 'oauth2' }>,
): Promise<{ success: boolean; error?: string }> {
  const cred = credentialStore.scoped(scope);
  const clientIdKey = defaultKey(method.clientIdKey, 'clientId');
  const clientSecretKey = defaultKey(method.clientSecretKey, 'clientSecret');
  const accessTokenKey = defaultKey(method.accessTokenKey, 'accessToken');
  const refreshTokenKey = defaultKey(method.refreshTokenKey, 'refreshToken');
  const expiresAtKey = defaultKey(method.expiresAtKey, 'expiresAt');

  const clientId = await cred.get<string>(clientIdKey);
  const clientSecret = await cred.get<string>(clientSecretKey);
  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'Client ID / Client Secret が未設定です',
    };
  }

  const redirectUri = redirectUriFor(scope, method);
  const state = randomState();
  const url = new URL(method.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  if (method.scopes && method.scopes.length > 0) {
    url.searchParams.set('scope', method.scopes.join(' '));
  }

  // 既存のペンディングがあれば打ち切る
  const existing = pendingFlows.get(scope);
  if (existing) {
    existing.reject(new Error('新しいフローが開始されたためキャンセル'));
    if (!existing.window.isDestroyed()) existing.window.close();
    pendingFlows.delete(scope);
  }

  const authWindow = new BrowserWindow({
    width: 560,
    height: 720,
    autoHideMenuBar: true,
    title: `${scope} authentication`,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  try {
    const code = await new Promise<string>((resolve, reject) => {
      pendingFlows.set(scope, {
        scope,
        state,
        resolve,
        reject,
        window: authWindow,
      });
      authWindow.on('closed', () => {
        const p = pendingFlows.get(scope);
        if (p) {
          p.reject(new Error('ユーザーが認証ウィンドウを閉じました'));
          pendingFlows.delete(scope);
        }
      });
      authWindow.loadURL(url.toString()).catch((err) => {
        reject(err as Error);
      });
    });

    // Token 交換
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('redirect_uri', redirectUri);

    const tokenRes = await fetch(method.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return {
        success: false,
        error: `token endpoint ${tokenRes.status}: ${text}`,
      };
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    await cred.set(accessTokenKey, tokenJson.access_token);
    if (tokenJson.refresh_token) {
      await cred.set(refreshTokenKey, tokenJson.refresh_token);
    }
    if (tokenJson.expires_in) {
      const expiresAt = Date.now() + tokenJson.expires_in * 1000;
      await cred.set(expiresAtKey, expiresAt);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  } finally {
    if (!authWindow.isDestroyed()) authWindow.close();
  }
}

/**
 * refresh_token を使って access_token を更新する。
 * アダプタの execute 内で 401 を検出したら呼ぶ想定。
 */
export async function refreshOAuthToken(
  scope: string,
  method: Extract<PluginAuthMethod, { type: 'oauth2' }>,
): Promise<{ success: boolean; error?: string }> {
  const cred = credentialStore.scoped(scope);
  const clientIdKey = defaultKey(method.clientIdKey, 'clientId');
  const clientSecretKey = defaultKey(method.clientSecretKey, 'clientSecret');
  const accessTokenKey = defaultKey(method.accessTokenKey, 'accessToken');
  const refreshTokenKey = defaultKey(method.refreshTokenKey, 'refreshToken');
  const expiresAtKey = defaultKey(method.expiresAtKey, 'expiresAt');

  const clientId = await cred.get<string>(clientIdKey);
  const clientSecret = await cred.get<string>(clientSecretKey);
  const refreshToken = await cred.get<string>(refreshTokenKey);
  if (!clientId || !clientSecret || !refreshToken) {
    return { success: false, error: 'refresh token が無いので再認証が必要です' };
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);

  const res = await fetch(method.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    return {
      success: false,
      error: `token refresh ${res.status}: ${await res.text()}`,
    };
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  await cred.set(accessTokenKey, json.access_token);
  if (json.refresh_token) {
    await cred.set(refreshTokenKey, json.refresh_token);
  }
  if (json.expires_in) {
    await cred.set(expiresAtKey, Date.now() + json.expires_in * 1000);
  }
  return { success: true };
}
