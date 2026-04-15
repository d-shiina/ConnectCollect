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

各 Step の進捗に応じて段階的に動く状態になります。Step 5 以降で
`pnpm dev` が Electron + Frontend + Python Agent をまとめて立ち上げます。

## テスト

```bash
pnpm test          # Node 側 (frontend / electron)
pnpm agent:test    # Python 側
```

## ライセンス

UNLICENSED (個人開発中)。
