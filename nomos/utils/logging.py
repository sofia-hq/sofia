"""Logging utilities for Nomos."""

import os
import sys
from functools import lru_cache
from logging import Logger
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from nomos.models.agent import Response


@lru_cache(maxsize=1)
def get_logger() -> Logger:
    """Get the configured logger."""
    LOG_LEVEL: str = os.getenv("NOMOS_LOG_LEVEL", "INFO").upper()
    ENABLE_LOGGING: bool = os.getenv("NOMOS_ENABLE_LOGGING", "false").lower() == "true"
    logger.remove()
    if ENABLE_LOGGING:
        config_dict = {
            "handlers": [
                {
                    "sink": sys.stdout,
                    "format": "{time:YYYY-MM-DD at HH:mm:ss} | {level} | {message}",
                    "level": LOG_LEVEL,
                },
            ],
        }
        logger.configure(**config_dict)
        logger.info(f"Logging is enabled. Log level set to {LOG_LEVEL}.")

    return logger


def log_debug(message: str) -> None:
    """Log a debug message."""
    logger = get_logger()
    logger.debug(message)


def log_info(message: str) -> None:
    """Log an info message."""
    logger = get_logger()
    logger.info(message)


def log_warning(message: str) -> None:
    """Log a warning message."""
    logger = get_logger()
    logger.warning(message)


def log_error(message: str) -> None:
    """Log an error message."""
    logger = get_logger()
    logger.error(message)


def pp_response(response: "Response") -> None:
    """Print the response from a Nomos session."""
    decision = response.decision
    tool_output = response.tool_output
    print(f"Decision: {decision}")
    print(f"Tool Output: {tool_output if tool_output is not None else 'None'}")
