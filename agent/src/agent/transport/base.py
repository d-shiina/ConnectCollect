"""Transport 抽象基底。

JSON-RPC dispatcher を受け取り、何らかの方法でリクエスト / 通知を流し込む。
通知 (notification: id 無しメッセージ) は engine から transport へ
push する経路も必要なため、両方向のメソッドを定義しておく。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from agent.rpc.dispatcher import Dispatcher


class Transport(ABC):
    """全てのトランスポート実装の基底。"""

    def __init__(self, dispatcher: Dispatcher) -> None:
        self._dispatcher = dispatcher

    @abstractmethod
    async def serve(self) -> None:
        """通信ループを開始する。終了するまで戻らない。"""

    @abstractmethod
    async def send_notification(
        self,
        method: str,
        params: dict[str, Any] | None = None,
    ) -> None:
        """サーバ→クライアントへの片方向通知を送る (id 無し JSON-RPC)。"""
