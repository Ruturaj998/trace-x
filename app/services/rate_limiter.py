import ipaddress
import logging
import os
import time
from collections import deque
from typing import Optional
from fastapi import HTTPException, Request

logger = logging.getLogger("tracex.security")


def get_trusted_proxies() -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """Parses comma-separated trusted proxy IPs or CIDR blocks from TRUSTED_PROXIES."""
    raw = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1")
    networks = []
    for entry in raw.split(","):
        cleaned = entry.strip()
        if not cleaned:
            continue
        try:
            networks.append(ipaddress.ip_network(cleaned, strict=False))
        except ValueError:
            logger.warning(f"Invalid TRUSTED_PROXIES entry: {cleaned}")
    return networks


def parse_ip_address(ip_str: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Safely extracts and parses an IP address, handling optional port and brackets."""
    if not ip_str or not isinstance(ip_str, str):
        return None
    cleaned = ip_str.strip()
    if cleaned.startswith("[") and "]" in cleaned:
        cleaned = cleaned[1:cleaned.index("]")]
    elif ":" in cleaned and "." in cleaned:
        cleaned = cleaned.split(":")[0]

    try:
        return ipaddress.ip_address(cleaned)
    except ValueError:
        return None


def is_ip_in_networks(
    ip: ipaddress.IPv4Address | ipaddress.IPv6Address,
    networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network],
) -> bool:
    """Checks whether an IP address belongs to any configured trusted network."""
    for net in networks:
        if ip in net:
            return True
    return False


def get_client_ip(request: Request) -> str:
    """
    Safely resolves the true client IP address.

    Security Rules:
    1. Direct peer IP (request.client.host) is always inspected first.
    2. If direct peer IP is NOT in TRUSTED_PROXIES, all forwarding headers
       (X-Forwarded-For, X-Real-IP) are completely ignored to prevent spoofing.
    3. If direct peer IP IS a trusted proxy:
       Walks backward (right-to-left) through X-Forwarded-For, skipping known
       trusted proxies until reaching the first untrusted IP. That untrusted IP
       is the authenticated client IP.
    4. If no untrusted IP is found in X-Forwarded-For, checks X-Real-IP.
    5. Falls back to direct peer IP.
    """
    raw_direct_ip = (
        request.client.host if request.client and request.client.host else "127.0.0.1"
    )
    direct_ip_obj = parse_ip_address(raw_direct_ip)

    if not direct_ip_obj:
        return raw_direct_ip

    trusted_networks = get_trusted_proxies()

    # If direct peer connection is not from a trusted proxy, reject all forwarding headers!
    if not is_ip_in_networks(direct_ip_obj, trusted_networks):
        return str(direct_ip_obj)

    # Direct peer IS a trusted proxy: inspect forwarding chain from right to left
    xff_header = request.headers.get("x-forwarded-for")
    if xff_header:
        hops = [h.strip() for h in xff_header.split(",") if h.strip()]
        for hop in reversed(hops):
            hop_ip = parse_ip_address(hop)
            if not hop_ip:
                continue
            if is_ip_in_networks(hop_ip, trusted_networks):
                continue
            return str(hop_ip)

    # Fallback to X-Real-IP if provided by trusted edge proxy
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        real_ip_obj = parse_ip_address(x_real_ip)
        if real_ip_obj and not is_ip_in_networks(real_ip_obj, trusted_networks):
            return str(real_ip_obj)

    return str(direct_ip_obj)


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int, max_tracked_ips: int = 10000):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_tracked_ips = max_tracked_ips
        self.history: dict[str, deque] = {}
        self._last_cleanup = time.time()

    def _cleanup_stale_entries(self, now: float) -> None:
        """Purge empty or completely expired queues to prevent unbounded memory growth."""
        cutoff = now - self.window_seconds
        keys_to_delete = []
        for key, queue in self.history.items():
            while queue and queue[0] <= cutoff:
                queue.popleft()
            if not queue:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self.history[key]
        self._last_cleanup = now

    def check(self, request: Request, key_prefix: str = "") -> None:
        is_testing = os.getenv("TESTING", "false").lower() in ("true", "1")
        is_disabled = os.getenv("DISABLE_RATE_LIMIT", "false").lower() in ("true", "1")
        enable_in_tests = os.getenv("ENABLE_RATE_LIMIT_IN_TESTS", "false").lower() in ("true", "1")

        if is_disabled or (is_testing and not enable_in_tests):
            return

        client_ip = get_client_ip(request)
        key = f"{key_prefix}:{client_ip}"
        now = time.time()

        # Periodic cleanup every 60s or if table gets too large
        if now - self._last_cleanup > 60.0 or len(self.history) > self.max_tracked_ips:
            self._cleanup_stale_entries(now)

        # Enforce hard capacity bound
        if len(self.history) >= self.max_tracked_ips and key not in self.history:
            oldest_key = next(iter(self.history))
            del self.history[oldest_key]

        queue = self.history.get(key)
        if queue is None:
            queue = deque()
            self.history[key] = queue

        # Purge timestamps outside window for this specific key
        cutoff = now - self.window_seconds
        while queue and queue[0] <= cutoff:
            queue.popleft()

        if len(queue) >= self.max_requests:
            retry_after = int(queue[0] + self.window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(max(1, retry_after))},
            )

        queue.append(now)


# Standard rate limits across sensitive routes
login_limiter = RateLimiter(max_requests=5, window_seconds=60)
register_limiter = RateLimiter(max_requests=5, window_seconds=60)
forgot_password_limiter = RateLimiter(max_requests=3, window_seconds=60)
reset_password_limiter = RateLimiter(max_requests=5, window_seconds=60)
change_password_limiter = RateLimiter(max_requests=5, window_seconds=60)
contact_limiter = RateLimiter(max_requests=3, window_seconds=60)
