"""JSON-RPC 2.0 ディスパッチャ。

メソッド名 → 非同期ハンドラ関数の単純なルーティング。
ハンドラは ``params: dict | list | None`` を受け取り、シリアライズ可能な
任意の値を返す (None もしくは dict / list / プリミティブ)。

エラーは ``JsonRpcError`` を投げると Dispatcher が JSON-RPC error 形式に変換する。
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, TypeAlias

# JSON-RPC 標準エラーコード
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

# 独自エラー範囲: -32000 〜 -32099 を agent エラーに使う
HANDLER_ERROR = -32000

Handler: TypeAlias = Callable[..., Awaitable[Any]]


class JsonRpcError(Exception):
    """ハンドラが投げると JSON-RPC エラー応答に変換される。"""

    def __init__(self, code: int, message: str, data: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


class Dispatcher:
    """メソッド登録 + リクエスト処理。"""

    def __init__(self) -> None:
        self._handlers: dict[str, Handler] = {}

    def register(self, method: str, handler: Handler) -> None:
        if method in self._handlers:
            raise ValueError(f"duplicate handler: {method}")
        self._handlers[method] = handler

    def methods(self) -> list[str]:
        return sorted(self._handlers.keys())

    async def handle(self, message: Any) -> dict[str, Any] | None:
        """1 つの JSON-RPC メッセージを処理して、応答を返す。

        通知 (id 無し) の場合は None を返す。リクエスト/エラー応答の場合は
        dict を返す。

        ``message`` は外部 (stdio 等) から来る任意の JSON 値なので、型は ``Any``。
        """
        if not isinstance(message, dict):
            return _error_response(None, INVALID_REQUEST, "Invalid Request")
        if message.get("jsonrpc") != "2.0":
            return _error_response(
                message.get("id"),
                INVALID_REQUEST,
                "jsonrpc version must be '2.0'",
            )
        method = message.get("method")
        if not isinstance(method, str):
            return _error_response(
                message.get("id"),
                INVALID_REQUEST,
                "method must be a string",
            )

        msg_id = message.get("id")
        is_notification = "id" not in message
        params = message.get("params")

        handler = self._handlers.get(method)
        if handler is None:
            if is_notification:
                return None
            return _error_response(
                msg_id,
                METHOD_NOT_FOUND,
                f"method not found: {method}",
            )

        try:
            result = await _invoke(handler, params)
        except JsonRpcError as exc:
            if is_notification:
                return None
            return _error_response(msg_id, exc.code, exc.message, exc.data)
        except Exception as exc:
            if is_notification:
                return None
            return _error_response(
                msg_id,
                INTERNAL_ERROR,
                f"internal error: {exc}",
            )

        if is_notification:
            return None
        return {"jsonrpc": "2.0", "id": msg_id, "result": result}


async def _invoke(handler: Handler, params: Any) -> Any:
    """handler のシグネチャに合わせて呼び出す。

    - params が None: 引数なしで呼ぶ
    - params が dict: kwargs として展開
    - それ以外: 1 引数として渡す
    """
    if params is None:
        coro = handler()
    elif isinstance(params, dict):
        coro = handler(**params)
    else:
        coro = handler(params)
    return await coro


def _error_response(
    msg_id: Any,
    code: int,
    message: str,
    data: Any = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": msg_id, "error": error}


def build_default_dispatcher(*, user_data_dir: str | None = None) -> Dispatcher:
    """Step 4 のデフォルト構成: system.health のみ登録。

    Step 6 以降で scenario / execution / node ハンドラを追加する。
    user_data_dir は scenario_store / log_store のためのパスで、Step 6 で使う。
    """
    from agent.rpc.handlers.system import register_system_handlers

    dispatcher = Dispatcher()
    register_system_handlers(dispatcher)
    # user_data_dir は将来の handler が利用する。今は使わないが引数だけ受けておく。
    _ = user_data_dir
    return dispatcher
