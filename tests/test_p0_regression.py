import os
import time
import pytest
from starlette.requests import Request
from starlette.testclient import TestClient

from app.main import app
from app.services.rate_limiter import (
    RateLimiter,
    get_client_ip,
    parse_ip_address,
    is_ip_in_networks,
    get_trusted_proxies,
)

client = TestClient(app)


def build_request(client_host: str, headers: dict | None = None) -> Request:
    """Helper to construct a mock ASGI Request object with arbitrary client IP and headers."""
    header_list = [
        (k.lower().encode("latin-1"), v.encode("latin-1"))
        for k, v in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/contact",
        "headers": header_list,
        "client": (client_host, 54321),
    }
    return Request(scope)


def test_ip_parser_valid_and_invalid():
    # Valid IPv4 and IPv6
    assert str(parse_ip_address("192.168.1.1")) == "192.168.1.1"
    assert str(parse_ip_address("127.0.0.1")) == "127.0.0.1"
    assert str(parse_ip_address("::1")) == "::1"
    assert str(parse_ip_address("2001:db8::1")) == "2001:db8::1"

    # With ports
    assert str(parse_ip_address("192.168.1.1:8080")) == "192.168.1.1"
    assert str(parse_ip_address("[::1]:8080")) == "::1"

    # Whitespace handling
    assert str(parse_ip_address("  10.0.0.5  ")) == "10.0.0.5"

    # Invalid values
    assert parse_ip_address("") is None
    assert parse_ip_address("not-an-ip") is None
    assert parse_ip_address("999.999.999.999") is None


def test_direct_untrusted_connection_ignores_forwarding_headers():
    """
    If a direct connection arrives from an untrusted peer (e.g. 203.0.113.195),
    all forwarding headers (X-Forwarded-For, X-Real-IP) MUST be ignored.
    """
    req = build_request(
        client_host="203.0.113.195",
        headers={
            "X-Forwarded-For": "1.1.1.1, 2.2.2.2",
            "X-Real-IP": "3.3.3.3",
        },
    )
    resolved_ip = get_client_ip(req)
    assert resolved_ip == "203.0.113.195", (
        f"Expected direct peer IP 203.0.113.195, but got {resolved_ip}. "
        "Forwarding headers were untrusted and must be ignored!"
    )


def test_trusted_proxy_single_hop():
    """
    When connection arrives from trusted proxy (127.0.0.1),
    X-Forwarded-For contains real client IP appended by Nginx.
    """
    req = build_request(
        client_host="127.0.0.1",
        headers={
            "X-Forwarded-For": "198.51.100.42",
        },
    )
    resolved_ip = get_client_ip(req)
    assert resolved_ip == "198.51.100.42"


def test_trusted_proxy_spoofed_chain():
    """
    An attacker attempts to spoof X-Forwarded-For by sending '8.8.8.8, 9.9.9.9'.
    Nginx appends the actual remote address (203.0.113.77) to the end:
    '8.8.8.8, 9.9.9.9, 203.0.113.77'.
    Walking right-to-left, the first untrusted IP is 203.0.113.77.
    """
    req = build_request(
        client_host="127.0.0.1",
        headers={
            "X-Forwarded-For": "8.8.8.8, 9.9.9.9, 203.0.113.77",
        },
    )
    resolved_ip = get_client_ip(req)
    assert resolved_ip == "203.0.113.77", (
        f"Expected true client IP 203.0.113.77, but got {resolved_ip}. "
        "Spoofed client headers on the left were incorrectly trusted!"
    )


def test_trusted_proxy_multi_hop_traversal(monkeypatch):
    """
    If multiple trusted proxies exist in the chain (e.g. 10.0.0.1 is also a trusted internal load balancer),
    the resolver skips 10.0.0.1 and returns the first untrusted IP.
    """
    monkeypatch.setenv("TRUSTED_PROXIES", "127.0.0.1,::1,10.0.0.0/8")
    req = build_request(
        client_host="127.0.0.1",
        headers={
            "X-Forwarded-For": "198.51.100.99, 10.0.0.1",
        },
    )
    resolved_ip = get_client_ip(req)
    assert resolved_ip == "198.51.100.99"


def test_rate_limiter_blocks_spoofed_header_bypass(monkeypatch):
    """
    Verify that an attacker attempting to bypass rate limiting by rotating
    the spoofed left portion of X-Forwarded-For is strictly blocked.
    """
    monkeypatch.setenv("ENABLE_RATE_LIMIT_IN_TESTS", "true")
    monkeypatch.delenv("DISABLE_RATE_LIMIT", raising=False)

    limiter = RateLimiter(max_requests=3, window_seconds=60)
    real_ip = "203.0.113.88"

    # Attacker sends 3 requests through trusted proxy, each with a different forged IP on the left
    for i in range(3):
        req = build_request(
            client_host="127.0.0.1",
            headers={"X-Forwarded-For": f"1.2.3.{i}, {real_ip}"},
        )
        limiter.check(req, "test_spoof")

    # 4th request must be rejected with HTTP 429
    req_blocked = build_request(
        client_host="127.0.0.1",
        headers={"X-Forwarded-For": f"10.99.88.77, {real_ip}"},
    )
    with pytest.raises(Exception) as exc_info:
        limiter.check(req_blocked, "test_spoof")
    assert exc_info.value.status_code == 429


def test_rate_limiter_stale_entry_cleanup(monkeypatch):
    """
    Verify that expired timestamps and empty queues are evicted from memory
    rather than accumulating unbounded keys.
    """
    monkeypatch.setenv("ENABLE_RATE_LIMIT_IN_TESTS", "true")
    monkeypatch.delenv("DISABLE_RATE_LIMIT", raising=False)
    limiter = RateLimiter(max_requests=5, window_seconds=1)

    # Populate entries for 3 different IPs
    for ip in ("192.0.2.1", "192.0.2.2", "192.0.2.3"):
        req = build_request(client_host="127.0.0.1", headers={"X-Forwarded-For": ip})
        limiter.check(req, "cleanup")

    assert len(limiter.history) == 3

    # Fast forward past window
    future_time = time.time() + 2.0
    limiter._cleanup_stale_entries(now=future_time)

    # All stale keys must have been pruned from memory
    assert len(limiter.history) == 0, (
        f"Expected history to be empty after stale cleanup, but had {len(limiter.history)} keys"
    )


def test_rate_limiter_max_capacity_bound(monkeypatch):
    """
    Verify that RateLimiter enforces max_tracked_ips and does not exceed memory bounds.
    """
    monkeypatch.setenv("ENABLE_RATE_LIMIT_IN_TESTS", "true")
    monkeypatch.delenv("DISABLE_RATE_LIMIT", raising=False)
    max_bound = 5
    limiter = RateLimiter(max_requests=10, window_seconds=60, max_tracked_ips=max_bound)

    for i in range(10):
        req = build_request(
            client_host="127.0.0.1",
            headers={"X-Forwarded-For": f"198.51.100.{i}"},
        )
        limiter.check(req, "capacity")

    assert len(limiter.history) <= max_bound, (
        f"RateLimiter history ({len(limiter.history)}) exceeded maximum capacity ({max_bound})"
    )
