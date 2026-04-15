# rpa-agent

RPA ツールの Python 実行エンジン。Electron main プロセスから子プロセスとして
起動され、stdin/stdout で JSON-RPC 2.0 メッセージをやり取りする。

## セットアップ

```bash
poetry install
```

## 単体起動 (デバッグ)

```bash
poetry run python -m agent
# stdin に JSON-RPC を流すと stdout に応答が返る
echo '{"jsonrpc":"2.0","id":1,"method":"system.health"}' | poetry run python -m agent
```

## テスト

```bash
poetry run pytest
```

## Lint / 型検査

```bash
poetry run ruff check src tests
poetry run mypy src
```
