# TRACE-X Production Server Configuration (Gunicorn + Uvicorn)
# Architecture: Internet -> Nginx (Reverse Proxy + SSL) -> Gunicorn/Uvicorn -> FastAPI -> PostgreSQL
#
# Production Start Command:
#   gunicorn -c deploy/gunicorn_conf.py app.main:app

import multiprocessing
import os

# Network Binding: Bind to localhost so the application port is only accessible
# internally via the Nginx reverse proxy, preventing direct public exposure.
bind = os.getenv("GUNICORN_BIND", "127.0.0.1:8000")

# Worker Processes: Recommend (2 x CPU cores) + 1 for I/O-bound web services
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))

# Worker Engine: High-performance asynchronous worker using Uvicorn
worker_class = "uvicorn.workers.UvicornWorker"

# Worker Lifecycle & Timeouts
worker_connections = 1000
timeout = 120
keepalive = 65
graceful_timeout = 30

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Process Naming
proc_name = "tracex_backend"
