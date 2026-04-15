"""Dispatcher のユニットテスト。"""

from __future__ import annotations

from typing import Any

import pytest

from agent.rpc.dispatcher import (
    INTERNAL_ERROR,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    Dispatcher,
    JsonRpcError,
    build_default_dispatcher,
)


def make_request(method: str, params: Any = None, *, msg_id: int = 1) -> dict[str, Any]:
    msg: dict[str, Any] = {"jsonrpc": "2.0", "id": msg_id, "method": method}
    if params is not None:
        msg["params"] = params
    return msg


@pytest.fixture
def dispatcher() -> Dispatcher:
    return Dispatcher()


async def test_register_and_invoke_no_params(dispatcher: Dispatcher) -> None:
    async def ping() -> str:
        return "pong"

    dispatcher.register("ping", ping)
    response = await dispatcher.handle(make_request("ping"))
    assert response == {"jsonrpc": "2.0", "id": 1, "result": "pong"}


async def test_register_and_invoke_with_dict_params(dispatcher: Dispatcher) -> None:
    async def add(a: int, b: int) -> int:
        return a + b

    dispatcher.register("add", add)
    response = await dispatcher.handle(make_request("add", {"a": 2, "b": 3}))
    assert response == {"jsonrpc": "2.0", "id": 1, "result": 5}


async def test_register_and_invoke_with_positional_param(
    dispatcher: Dispatcher,
) -> None:
    async def echo(value: Any) -> Any:
        return value

    dispatcher.register("echo", echo)
    response = await dispatcher.handle(make_request("echo", "hello"))
    assert response == {"jsonrpc": "2.0", "id": 1, "result": "hello"}


async def test_method_not_found(dispatcher: Dispatcher) -> None:
    response = await dispatcher.handle(make_request("missing"))
    assert response is not None
    assert response["error"]["code"] == METHOD_NOT_FOUND


async def test_invalid_request_missing_jsonrpc(dispatcher: Dispatcher) -> None:
    response = await dispatcher.handle({"id": 1, "method": "x"})
    assert response is not None
    assert response["error"]["code"] == INVALID_REQUEST


async def test_invalid_request_method_not_string(dispatcher: Dispatcher) -> None:
    response = await dispatcher.handle({"jsonrpc": "2.0", "id": 1, "method": 42})
    assert response is not None
    assert response["error"]["code"] == INVALID_REQUEST


async def test_notification_returns_none(dispatcher: Dispatcher) -> None:
    """id を含まないメッセージは通知扱いで応答を返さない。"""

    async def fire() -> None:
        return None

    dispatcher.register("fire", fire)
    # id キー無し
    response = await dispatcher.handle({"jsonrpc": "2.0", "method": "fire"})
    assert response is None


async def test_notification_for_unknown_method_returns_none(
    dispatcher: Dispatcher,
) -> None:
    response = await dispatcher.handle({"jsonrpc": "2.0", "method": "ghost"})
    assert response is None


async def test_handler_raises_jsonrpcerror(dispatcher: Dispatcher) -> None:
    async def boom() -> None:
        raise JsonRpcError(code=-32000, message="boom!", data={"detail": "x"})

    dispatcher.register("boom", boom)
    response = await dispatcher.handle(make_request("boom"))
    assert response is not None
    assert response["error"] == {
        "code": -32000,
        "message": "boom!",
        "data": {"detail": "x"},
    }


async def test_handler_raises_unexpected(dispatcher: Dispatcher) -> None:
    async def crash() -> None:
        raise RuntimeError("oops")

    dispatcher.register("crash", crash)
    response = await dispatcher.handle(make_request("crash"))
    assert response is not None
    assert response["error"]["code"] == INTERNAL_ERROR
    assert "oops" in response["error"]["message"]


async def test_duplicate_register_rejected(dispatcher: Dispatcher) -> None:
    async def h() -> None:
        return None

    dispatcher.register("dup", h)
    with pytest.raises(ValueError):
        dispatcher.register("dup", h)


async def test_default_dispatcher_has_system_health() -> None:
    dispatcher = build_default_dispatcher()
    assert "system.health" in dispatcher.methods()
    response = await dispatcher.handle(make_request("system.health"))
    assert response is not None
    result = response["result"]
    assert result["status"] == "ok"
    assert "agent_version" in result
    assert "python_version" in result
