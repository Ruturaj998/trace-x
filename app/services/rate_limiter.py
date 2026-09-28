import os
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history = defaultdict(deque)

    def check(self, request: Request, key_prefix: str = "") -> None:
        if os.getenv("TESTING", "false").lower() in ("true", "1") or os.getenv("DISABLE_RATE_LIMIT", "false").lower() in ("true", "1"):
            return

        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"
        key = f"{key_prefix}:{client_ip}"
        now = time.time()
        queue = self.history[key]

        # Purge timestamps outside window
        while queue and queue[0] <= now - self.window_seconds:
            queue.popleft()

        if len(queue) >= self.max_requests:
            retry_after = int(queue[0] + self.window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        queue.append(now)


# Limits: 5 requests per 60 seconds per IP for sensitive auth routes
login_limiter = RateLimiter(max_requests=5, window_seconds=60)
register_limiter = RateLimiter(max_requests=5, window_seconds=60)
forgot_password_limiter = RateLimiter(max_requests=3, window_seconds=60)
reset_password_limiter = RateLimiter(max_requests=5, window_seconds=60)
change_password_limiter = RateLimiter(max_requests=5, window_seconds=60)
