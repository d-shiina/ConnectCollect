"""Entry point: ``python -m agent``.

Step 4 では stdio JSON-RPC ループを起動するだけ。Step 5 で Electron main から
子プロセスとして spawn される。将来 (11.5 Agent化) は ``--mode=remote`` を
受けて WebSocket トランスポートに切り替える。
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from agent.rpc.dispatcher import Dispatcher, build_default_dispatcher
from agent.transport.stdio import StdioTransport


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="agent", description="rpa-agent")
    parser.add_argument(
        "--user-data-dir",
        type=str,
        default=None,
        help="Electron app.getPath('userData') 相当のディレクトリ",
    )
    parser.add_argument(
        "--mode",
        choices=["stdio"],
        default="stdio",
        help="トランスポート (現状 stdio のみ)",
    )
    return parser.parse_args(argv)


async def run(args: argparse.Namespace) -> int:
    dispatcher: Dispatcher = build_default_dispatcher(user_data_dir=args.user_data_dir)
    transport = StdioTransport(dispatcher=dispatcher)
    await transport.serve()
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
