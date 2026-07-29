from datetime import datetime, timezone


def utc_now_iso() -> str:
    """The record timestamp format: timezone-aware UTC, ISO 8601."""
    return datetime.now(timezone.utc).isoformat()
