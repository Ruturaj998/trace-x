from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.rate_limiter import RateLimiter

from app.database.base import Base
from app.database.connection import engine
from app.database.migrations.run_migrations import (
    apply_migrations,
    clean_sql,
    discover_migrations,
    get_applied_migrations,
    rollback_migration,
)


@pytest.mark.skipif(engine.dialect.name != "postgresql", reason="Requires PostgreSQL")
def test_upgrade_preserves_existing_telemetry():
    # Use a separate schema so rollback and legacy rows cannot affect API tests.
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA migration_test"))
    migration_engine = create_engine(
        engine.url,
        connect_args={"options": "-c search_path=migration_test -c timezone=Asia/Kolkata"},
    )
    try:
        migrations = discover_migrations()
        Base.metadata.create_all(migration_engine)
        with migration_engine.begin() as conn:
            for _, _, _, rollback in reversed(migrations):
                for statement in clean_sql(rollback.read_text()):
                    conn.execute(text(statement))
            conn.execute(text("INSERT INTO users (id, name, email) VALUES (1, 'Owner', 'owner@example.com')"))
            conn.execute(text(
                "INSERT INTO devices (id, device_name, device_identifier, user_id, status) "
                "VALUES (1, 'Receiver', 'legacy-unit', 1, 'lost')"
            ))
            conn.execute(text(
                "INSERT INTO locations (device_id, latitude, longitude, timestamp) "
                "VALUES (1, 18.52, 73.85, '2025-01-01 12:00:00')"
            ))
            conn.execute(text(
                "INSERT INTO device_status_history (device_id, old_status, new_status, changed_at) "
                "VALUES (1, 'active', 'lost', '2025-01-01 12:00:00')"
            ))

        apply_migrations(migration_engine)
        apply_migrations(migration_engine)
        rollback_migration(migration_engine)
        apply_migrations(migration_engine)

        # Independent sessions and limiters compete for the same two slots.
        def reserve(_):
            with Session(migration_engine) as session:
                try:
                    RateLimiter(2, 60)._reserve_postgres(session, "migration-test")
                except HTTPException as exc:
                    assert int(exc.headers["Retry-After"]) > 0
                    return exc.status_code
            return 200

        with ThreadPoolExecutor(max_workers=6) as pool:
            assert sorted(pool.map(reserve, range(6))) == [200, 200, 429, 429, 429, 429]

        with migration_engine.begin() as conn:
            assert set(get_applied_migrations(conn)) == {item[1] for item in migrations}
            expected = datetime(2025, 1, 1, 12, tzinfo=timezone.utc)
            assert conn.execute(text("SELECT timestamp FROM locations")).scalar_one() == expected
            assert conn.execute(text("SELECT changed_at FROM device_status_history")).scalar_one() == expected
            assert conn.execute(text("SELECT last_seen FROM devices")).scalar_one() is None
            assert conn.execute(text("SELECT idempotency_key FROM locations")).scalar_one() is None
            conn.execute(text("DELETE FROM devices WHERE id = 1"))
            assert conn.execute(text("SELECT count(*) FROM locations")).scalar_one() == 0
            assert conn.execute(text("SELECT count(*) FROM device_status_history")).scalar_one() == 0
    finally:
        migration_engine.dispose()
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA migration_test CASCADE"))
