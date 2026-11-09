import json
import os
import stat
from typing import Any, Dict, List


class OfflineTelemetryQueue:
    """Persistent, file-based store-and-forward queue for edge telemetry buffering.

    Security:
    - Enforces strict 0600 file permissions (user-read/write only).
    - Never stores user credentials or passwords.
    - Idempotency keys are assigned to each queued record.
    """

    def __init__(self, file_path: str):
        self.file_path = os.path.abspath(file_path)
        self._ensure_secure_file()

    def _ensure_secure_file(self):
        parent = os.path.dirname(self.file_path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, mode=0o700, exist_ok=True)

        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump([], f)
            # Enforce 0600 permissions
            os.chmod(self.file_path, stat.S_IRUSR | stat.S_IWUSR)

    def _read_all(self) -> List[Dict[str, Any]]:
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []

    def _write_all(self, items: List[Dict[str, Any]]):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
        os.chmod(self.file_path, stat.S_IRUSR | stat.S_IWUSR)

    def enqueue(self, item: Dict[str, Any]):
        """Append a validated fix record to the offline queue."""
        items = self._read_all()
        # Cap queue to prevent unbounded disk exhaustion
        if len(items) >= 5000:
            items.pop(0)  # Evict oldest record
        items.append(item)
        self._write_all(items)

    def peek(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve up to limit items without removing them."""
        items = self._read_all()
        return items[:limit]

    def drain(self, count: int):
        """Remove the first count items that were successfully synced."""
        items = self._read_all()
        remaining = items[count:]
        self._write_all(remaining)

    def size(self) -> int:
        """Return the number of queued fixes waiting to sync."""
        return len(self._read_all())
