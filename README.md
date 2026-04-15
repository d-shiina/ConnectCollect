# rpa-tool

自作の逐次実行型 RPA ツール (MVP)。Electron シェル + React エディタ +
Python 実行エンジン (stdio JSON-RPC) で構成される。

> スコープ・アーキテクチャ・実装順序の詳細は [`DESIGN.md`](./DESIGN.md) を参照。

## モノレポ構成

```
.
├── electron/   # Electron main (Node.js + TypeScript)
├── frontend/   # React + Vite + Tailwind (Renderer)
├── agent/      # Python 実行エンジン (Poetry)
└── shared/     # Electron と agent で共有する JSON スキーマ
```

## 必須環境

- Node.js **22 以上** (`.nvmrc` 参照)
- pnpm **9 以上**
- Python **3.11 以上**
- Poetry

## セットアップ

```bash
# Node 側
pnpm install

# Python 側
pnpm run agent:install
```

## 開発起動

```bash
pnpm dev
```

`pnpm dev` は次を並行起動します:

1. `frontend` の Vite dev server (`http://localhost:5173`)
2. Vite が起動したら `electron` の main をビルドして起動
   - `VITE_DEV_SERVER_URL` 環境変数で Vite を指す
   - 起動時に Python agent (`python -m agent`) を子プロセスとして spawn
   - DevTools が detach モードで自動で開く

Python ランタイムの解決順:

1. `RPA_AGENT_PYTHON` 環境変数 (絶対パス)
2. `agent/.venv/bin/python` (Poetry で作成された venv)
3. システムの `python3`

## テスト

```bash
pnpm test          # Node 側 (frontend / electron)
pnpm agent:test    # Python 側
```

## ライセンス

UNLICENSED (個人開発中)。
