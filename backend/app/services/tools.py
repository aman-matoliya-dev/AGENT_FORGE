"""The deliberately small, safe Phase 2 tool registry."""

import ast
import operator
import re
from datetime import datetime
from typing import Callable

_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
        ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod,
        ast.USub: operator.neg, ast.UAdd: operator.pos}
SUPPORTED_TOOLS = frozenset(("calculator", "datetime"))


def calculate(expression: str) -> str:
    expression = expression.strip()
    if len(expression) > 100 or not re.fullmatch(r"[0-9+\-*/(). %]+", expression):
        raise ValueError("only basic arithmetic is allowed")

    def visit(node: ast.AST) -> float | int:
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](visit(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 100:
                raise ValueError("exponent is too large")
            return _OPS[type(node.op)](left, right)
        raise ValueError("unsupported expression")

    try:
        value = visit(ast.parse(expression, mode="eval"))
        if abs(value) > 1e100:
            raise ValueError("result is too large")
        return str(value)
    except (ValueError, SyntaxError, ZeroDivisionError, OverflowError):
        raise ValueError("invalid arithmetic expression") from None


def _find_expression(message: str) -> str | None:
    match = re.search(r"(?<!\w)[0-9][0-9+\-*/(). %]*(?<![+\-*/])", message)
    return match.group(0).strip() if match and re.search(r"[-+*/]", match.group(0)) else None


def invoke(enabled: list[str], message: str) -> tuple[list[str], list[str], str]:
    """Return (used, unavailable, runtime instructions) and never execute unknown tools."""
    used: list[str] = []
    unavailable = sorted(set(enabled) - SUPPORTED_TOOLS)
    lines: list[str] = []
    if "calculator" in enabled:
        expression = _find_expression(message)
        if expression:
            try:
                result = calculate(expression)
                lines.append(f"Calculator result for {expression}: {result}")
            except ValueError as error:
                lines.append(f"Calculator failed safely: {error}")
            used.append("calculator")
    if "datetime" in enabled and re.search(r"\b(now|today|current time|date)\b", message, re.I):
        lines.append(f"Current local date/time: {datetime.now().astimezone().isoformat(timespec='minutes')}")
        used.append("datetime")
    return used, unavailable, "\n".join(lines) or "No tool was invoked for this message."


def registry() -> list[dict[str, str | bool]]:
    return [
        {"name": "calculator", "enabled": True, "description": "Safe basic arithmetic"},
        {"name": "datetime", "enabled": True, "description": "Current local date/time"},
    ]
