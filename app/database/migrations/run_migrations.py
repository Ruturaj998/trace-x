"""TRACE-X Database Migration Runner
Tracks and applies versioned SQL migrations using the configured database engine.

Usage:
  python -m app.database.migrations.run_migrations up
  python -m app.database.migrations.run_migrations down
  python -m app.database.migrations.run_migrations status
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple, Optional, Set
from sqlalchemy import text
from app.database.connection import engine

MIGRATIONS_DIR = Path(__file__).resolve().parent


def clean_sql(content: str) -> List[str]:
    """Strip comment lines and split SQL script into individual executable statements."""
    lines = []
    for line in content.splitlines():
        trimmed = line.strip()
        if trimmed.startswith("--"):
            continue
        lines.append(line)
    full_text = "\n".join(lines)
    statements = [stmt.strip() for stmt in full_text.split(";") if stmt.strip()]
    return statements


def ensure_migrations_table(conn):
    """Ensure the schema_migrations tracking table exists."""
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
    )


def get_applied_migrations(conn) -> dict[str, str]:
    """Return dictionary of {version: applied_at_iso} for all applied migrations."""
    ensure_migrations_table(conn)
    result = conn.execute(text("SELECT version, applied_at FROM schema_migrations ORDER BY version ASC;"))
    return {row[0]: str(row[1]) for row in result.fetchall()}


def discover_migrations(directory: Path = MIGRATIONS_DIR) -> List[Tuple[int, str, Path, Optional[Path]]]:
    """Discover forward and rollback migration files in numerical order.
    Returns list of (version_num, version_name, forward_path, rollback_path).
    """
    migrations = []
    forward_pattern = re.compile(r"^(\d+)_(.+)\.sql$")

    for file_path in directory.glob("*.sql"):
        if file_path.name.endswith("_rollback.sql"):
            continue
        match = forward_pattern.match(file_path.name)
        if match:
            version_num = int(match.group(1))
            version_name = file_path.stem
            rollback_name = f"{version_name}_rollback.sql"
            rollback_path = directory / rollback_name
            migrations.append(
                (
                    version_num,
                    version_name,
                    file_path,
                    rollback_path if rollback_path.exists() else None,
                )
            )

    migrations.sort(key=lambda item: item[0])
    return migrations


def apply_migrations(target_engine=None):
    """Apply all pending migrations in ascending version order."""
    eng = target_engine or engine
    migrations = discover_migrations()

    if not migrations:
        print("No migration files found.")
        return

    with eng.begin() as conn:
        applied = get_applied_migrations(conn)
        pending = [m for m in migrations if m[1] not in applied]

        if not pending:
            print("Database is up to date. No pending migrations.")
            return

        for version_num, version_name, forward_path, _ in pending:
            print(f"Applying migration: {forward_path.name}...")
            statements = clean_sql(forward_path.read_text())
            for stmt in statements:
                conn.execute(text(stmt))
            conn.execute(
                text("INSERT INTO schema_migrations (version) VALUES (:v);"),
                {"v": version_name},
            )
            print(f"Successfully applied {version_name}.")

    print("All pending migrations applied successfully.")


def rollback_migration(target_engine=None):
    """Roll back the single most recently applied migration."""
    eng = target_engine or engine
    migrations = discover_migrations()
    migration_map = {m[1]: m for m in migrations}

    with eng.begin() as conn:
        applied = get_applied_migrations(conn)
        if not applied:
            print("No migrations to rollback.")
            return

        # Find the latest applied version according to discovery order
        applied_in_order = [m for m in migrations if m[1] in applied]
        if not applied_in_order:
            print(f"Warning: Applied migrations {list(applied.keys())} not recognized in local directory.")
            return

        latest = applied_in_order[-1]
        version_num, version_name, _, rollback_path = latest

        if not rollback_path or not rollback_path.exists():
            print(f"Error: Rollback script for {version_name} not found ({rollback_path})")
            sys.exit(1)

        print(f"Rolling back migration: {rollback_path.name}...")
        statements = clean_sql(rollback_path.read_text())
        for stmt in statements:
            conn.execute(text(stmt))

        conn.execute(
            text("DELETE FROM schema_migrations WHERE version = :v;"),
            {"v": version_name},
        )
        print(f"Successfully rolled back {version_name}.")


def print_status(target_engine=None):
    """Print the status of all discovered migrations."""
    eng = target_engine or engine
    migrations = discover_migrations()

    with eng.begin() as conn:
        applied = get_applied_migrations(conn)

    print("=" * 70)
    print(f"{'Migration Version':<40} {'Status':<12} {'Applied At'}")
    print("=" * 70)
    for _, version_name, _, _ in migrations:
        if version_name in applied:
            status = "APPLIED"
            applied_at = applied[version_name]
        else:
            status = "PENDING"
            applied_at = "-"
        print(f"{version_name:<40} {status:<12} {applied_at}")
    print("=" * 70)


if __name__ == "__main__":
    action = sys.argv[1].lower() if len(sys.argv) > 1 else "up"
    if action == "down":
        rollback_migration()
    elif action == "status":
        print_status()
    elif action == "up":
        apply_migrations()
    else:
        print(f"Unknown action: {action}. Expected 'up', 'down', or 'status'.")
        sys.exit(1)
