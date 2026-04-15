"""system.* ハンドラ群。"""

from __future__ import annotations

import platform
import time
from typing import Any

from agent import __version__
from agent.rpc.dispatcher import Dispatcher

_STARTED_AT = time.time()


async def health() -> dict[str, Any]:
    """``system.health``: agent の生存確認とバージョン情報。"""
    return {
        "status": "ok",
        "agent_version": __version__,
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "uptime_seconds": round(time.time() - _STARTED_AT, 3),
    }


def register_system_handlers(dispatcher: Dispatcher) -> None:
    dispatcher.register("system.health", health)
