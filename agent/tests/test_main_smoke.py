"""``python -m agent`` を子プロセスで起動して JSON-RPC を流す統合スモークテスト。

目的: stdio トランスポートが実プロセスで成立することを確認。
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


async def test_system_health_via_subprocess() -> None:
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "agent",
        cwd=REPO_ROOT,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    assert proc.stdin is not None
    assert proc.stdout is not None

    request = {"jsonrpc": "2.0", "id": 1, "method": "system.health"}
    proc.stdin.write((json.dumps(request) + "\n").encode("utf-8"))
    await proc.stdin.drain()

    line = await proc.stdout.readline()
    assert line, "agent did not respond"
    response = json.loads(line.decode("utf-8"))
    assert response["id"] == 1
    assert response["result"]["status"] == "ok"

    # EOF を送ると agent が自然に終了する
    proc.stdin.close()
    try:
        await asyncio.wait_for(proc.wait(), timeout=5)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        raise
