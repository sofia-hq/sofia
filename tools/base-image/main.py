"""Minimal server wrapper for Nomos base image."""

from pathlib import Path
import os

from nomos.server import run_server


def main() -> None:
    """Run the Nomos FastAPI server using the built-in implementation."""
    config_path = Path("config.agent.yaml")
    port = int(os.getenv("PORT", "8000"))
    workers = int(os.getenv("WORKERS", "1"))
    run_server(config_path, port=port, workers=workers)


if __name__ == "__main__":
    main()
