from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(request_id)s] %(name)s - %(message)s",
        datefmt="%H:%M:%S",
        force=True,
    )

    request_filter = RequestIdFilter()

    for handler in logging.getLogger().handlers:
        handler.addFilter(request_filter)


def start_request_context() -> tuple[str, float]:
    request_id = uuid.uuid4().hex[:10]
    request_id_var.set(request_id)
    return request_id, time.perf_counter()
