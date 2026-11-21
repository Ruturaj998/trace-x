# PostgreSQL bootstrap and upgrades

Use a direct connection and a schema-owner role for bootstrap and migrations. Configure `DATABASE_URL` in the process environment with the target host and database and confirm the target and its search path before running any DDL. The commands below apply to an authorized target.

### Empty schema

1. Provision an empty PostgreSQL database or schema and set `DATABASE_URL` to that target. Use the same search path for each command.
2. Run `python -m app.database.init_db`. SQLAlchemy metadata imports all six models and creates the base tables, indexes and foreign keys. The API itself does not bootstrap the schema.
3. Run `python -m app.database.migrations.run_migrations up`. Migration 001 adds indexes, 002 aligns foreign keys and UTC timestamp types, 003 adds device identity and offline capture columns, and 004 creates the shared rate-limit table. The SQL series assumes the six application tables already exist.
4. Run `python -m app.database.migrations.run_migrations status` and confirm 001–004 are applied. The status command creates the migration ledger if missing. The runtime role needs select, insert and delete access to `rate_limit_hits`. Start the API and verify an authenticated workflow after the health check passes.

### Existing schema

Take a restorable backup and rehearse against a copy. Compare the current tables and migration ledger to the expected baseline, particularly existing foreign-key names and the source timezone of legacy timestamps. Run `up` and verify with `status`. If a legacy database is missing an entire base table, review and create that table before applying migrations. `create_all()` leaves existing tables structurally unchanged.

The runner serializes PostgreSQL operations with a transaction-scoped advisory lock. Pending DDL and ledger updates share a transaction, so a failure rolls back that batch. Resolve the underlying problem before retrying. Migration 002 interprets legacy naive timestamps as UTC. Fix or verify that assumption before upgrading data created in another timezone. Migration 003 rollback permanently removes its columns and their contents. The metadata and SQL use different names for some equivalent indexes, which can leave redundant indexes on a fresh install. Inspect catalog definitions and query usage before removing any.

### TLS and pooling

- Prefer `postgresql+psycopg://`. Standard `postgresql://` and `postgres://` provider URLs are normalized to psycopg. Preserve provider connection options in the URL and percent-encode special characters in credentials.
- Set `DB_SSLMODE=verify-full` for remote connections when trusted CA and hostname verification are configured. The environment value overrides the URL's `sslmode`. Follow the provider's certificate instructions.
- `DB_POOL_SIZE`, `DB_MAX_OVERFLOW` and `DB_POOL_RECYCLE` are per process. Budget up to `workers × (pool size + overflow)` application connections. Start with one worker, a pool of two and one overflow slot for a demo.
- For a transaction-mode pooler, set `DB_TRANSACTION_POOLER=true` to disable psycopg's automatic prepared statements. Use the direct endpoint for DDL and validate your provider's pooler separately. [Psycopg prepared statements](https://www.psycopg.org/psycopg3/docs/advanced/prepare.html)
