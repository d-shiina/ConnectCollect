"""stdin/stdout を使った JSON-RPC 2.0 トランスポート。

プロトコル:
  - 1 行 = 1 メッセージ (改行区切り JSON)
  - リクエスト/通知は client→server に流れ、`Dispatcher` が処理する
  - サーバから push したい通知 (実行イベント等) は ``send_notification`` で stdout へ書く

Step 4 段階では `system.health` 1 メソッドだけが Dispatcher に登録されている。
Step 9 で実行エンジンが ``send_notification`` を経由して `execution.event` を流す。
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from agent.rpc.dispatcher import Dispatcher
from agent.transport.base import Transport


class StdioTransport(Transport):
    """stdin から JSON-RPC を読み、stdout へ応答を書く。"""

    def __init__(self, dispatcher: Dispatcher) -> None:
        super().__init__(dispatcher)
        # stdout への並行書き込みを直列化するロック
        self._write_lock = asyncio.Lock()
        # create_task の戻り値を保持しないと GC で消える可能性がある (RUF006)
        self._tasks: set[asyncio.Task[None]] = set()

    async def serve(self) -> None:
        loop = asyncio.get_running_loop()
        reader = asyncio.StreamReader(loop=loop)
        protocol = asyncio.StreamReaderProtocol(reader, loop=loop)
        await loop.connect_read_pipe(lambda: protocol, sys.stdin)

        while True:
            line_bytes = await reader.readline()
            if not line_bytes:
                # EOF: 親プロセスが stdin を閉じた → エージェントも終了
                # 残っているタスクを完了まで待つ
                if self._tasks:
                    await asyncio.gather(*self._tasks, return_exceptions=True)
                return
            line = line_bytes.decode("utf-8").strip()
            if not line:
                continue
            # メッセージ処理はバックグラウンドに投げて、次の読み取りをブロックしない
            task = asyncio.create_task(self._handle_line(line))
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)

    async def _handle_line(self, line: str) -> None:
        try:
            message = json.loads(line)
        except json.JSONDecodeError as exc:
            await self._write_message(
                {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": f"Parse error: {exc.msg}",
                    },
                }
            )
            return

        response = await self._dispatcher.handle(message)
        if response is not None:
            await self._write_message(response)

    async def send_notification(
        self,
        method: str,
        params: dict[str, Any] | None = None,
    ) -> None:
        message: dict[str, Any] = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            message["params"] = params
        await self._write_message(message)

    async def _write_message(self, message: dict[str, Any]) -> None:
        line = json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n"
        async with self._write_lock:
            sys.stdout.write(line)
            sys.stdout.flush()
