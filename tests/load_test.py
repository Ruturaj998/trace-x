"""TRACE-X Automated Performance & Load Testing Suite
Executes reproducible concurrent benchmark scenarios against local FastAPI application.
Measures throughput (RPS), error rate, and response latency percentiles (p50, p90, p95, p99).

Usage:
  python tests/load_test.py
"""

import asyncio
import os
import statistics
import time
import uuid
import httpx

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.device import Device
from app.models.location import Location
from app.models.device_status_history import DeviceStatusHistory
from app.services.auth import create_access_token, hash_password


async def run_scenario(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict | None = None,
    json_body: dict | None = None,
    total_requests: int = 100,
    concurrency: int = 10,
):
    semaphore = asyncio.Semaphore(concurrency)
    latencies = []
    errors = 0

    async def single_request():
        nonlocal errors
        async with semaphore:
            start = time.perf_counter()
            try:
                if method.upper() == "GET":
                    resp = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    resp = await client.post(url, headers=headers, json=json_body)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                duration_ms = (time.perf_counter() - start) * 1000
                if resp.status_code >= 400:
                    errors += 1
                else:
                    latencies.append(duration_ms)
            except Exception as e:
                errors += 1

    start_all = time.perf_counter()
    tasks = [asyncio.create_task(single_request()) for _ in range(total_requests)]
    await asyncio.gather(*tasks)
    total_time = time.perf_counter() - start_all

    rps = total_requests / total_time if total_time > 0 else 0
    error_rate = (errors / total_requests) * 100 if total_requests > 0 else 0

    latencies_sorted = sorted(latencies)
    p50 = statistics.median(latencies_sorted) if latencies_sorted else 0
    p90 = (
        latencies_sorted[int(len(latencies_sorted) * 0.90)]
        if latencies_sorted
        else 0
    )
    p95 = (
        latencies_sorted[int(len(latencies_sorted) * 0.95)]
        if latencies_sorted
        else 0
    )
    p99 = (
        latencies_sorted[int(len(latencies_sorted) * 0.99)]
        if latencies_sorted
        else 0
    )
    mean_lat = statistics.mean(latencies_sorted) if latencies_sorted else 0
    min_lat = latencies_sorted[0] if latencies_sorted else 0
    max_lat = latencies_sorted[-1] if latencies_sorted else 0

    return {
        "total_requests": total_requests,
        "concurrency": concurrency,
        "duration_sec": round(total_time, 2),
        "rps": round(rps, 2),
        "errors": errors,
        "error_rate_pct": round(error_rate, 2),
        "min_ms": round(min_lat, 2),
        "mean_ms": round(mean_lat, 2),
        "p50_ms": round(p50, 2),
        "p90_ms": round(p90, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "max_ms": round(max_lat, 2),
    }


async def main():
    print("=" * 70)
    print("TRACE-X LOAD & LATENCY BENCHMARK SUITE")
    print("=" * 70)

    # 1. Setup synthetic test user and devices
    db = SessionLocal()
    test_email = f"loadtest_{uuid.uuid4().hex[:8]}@example.com"
    test_user = User(
        name="Load Tester",
        email=test_email,
        password_hash=hash_password("loadtestpass123"),
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    # Add 5 synthetic devices with location and status records
    device_ids = []
    for i in range(5):
        dev = Device(
            device_name=f"Benchmark Device {i+1}",
            device_identifier=f"BENCH-{uuid.uuid4().hex[:12]}",
            user_id=test_user.id,
            status="active" if i % 2 == 0 else "lost",
        )
        db.add(dev)
        db.commit()
        db.refresh(dev)
        device_ids.append(dev.id)

        # Add location fixes
        for j in range(10):
            loc = Location(
                device_id=dev.id,
                latitude=37.7749 + (j * 0.001),
                longitude=-122.4194 + (j * 0.001),
                accuracy=10.0,
            )
            db.add(loc)

        # Add status history
        hist = DeviceStatusHistory(
            device_id=dev.id,
            old_status="active",
            new_status="lost",
        )
        db.add(hist)

    db.commit()

    token = create_access_token(test_user.id)
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Disable rate limiter for load test
    os.environ["DISABLE_RATE_LIMIT"] = "true"

    scenarios = [
        {
            "name": "Public /health Probe",
            "method": "GET",
            "url": "http://testserver/health",
            "headers": None,
            "body": None,
            "requests": 200,
            "concurrency": 10,
        },
        {
            "name": "Authenticated /dashboard/summary",
            "method": "GET",
            "url": "http://testserver/dashboard/summary",
            "headers": auth_headers,
            "body": None,
            "requests": 200,
            "concurrency": 10,
        },
        {
            "name": "Authenticated /dashboard/latest-location",
            "method": "GET",
            "url": "http://testserver/dashboard/latest-location",
            "headers": auth_headers,
            "body": None,
            "requests": 200,
            "concurrency": 10,
        },
        {
            "name": "Authenticated /devices Query",
            "method": "GET",
            "url": "http://testserver/devices",
            "headers": auth_headers,
            "body": None,
            "requests": 200,
            "concurrency": 10,
        },
        {
            "name": "Public /contact Submission",
            "method": "POST",
            "url": "http://testserver/contact",
            "headers": None,
            "body": {
                "name": "Synthetic User",
                "email": "synthetic@example.com",
                "subject": "General Inquiry",
                "message": "Performance benchmark automated payload verifying ingestion throughput.",
                "honeypot": "",
            },
            "requests": 100,
            "concurrency": 5,
        },
    ]

    results = []

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for sc in scenarios:
            print(f"\nRunning benchmark: {sc['name']} ({sc['requests']} reqs, {sc['concurrency']} concurrent)...")
            res = await run_scenario(
                client=client,
                method=sc["method"],
                url=sc["url"],
                headers=sc["headers"],
                json_body=sc["body"],
                total_requests=sc["requests"],
                concurrency=sc["concurrency"],
            )
            res["name"] = sc["name"]
            results.append(res)
            print(
                f"  -> RPS: {res['rps']} | Mean: {res['mean_ms']}ms | p50: {res['p50_ms']}ms | p95: {res['p95_ms']}ms | p99: {res['p99_ms']}ms | Errors: {res['errors']} ({res['error_rate_pct']}%)"
            )

    # Clean up test user & devices (cascades to locations and history)
    db.delete(test_user)
    db.commit()
    db.close()

    print("\n" + "=" * 70)
    print("BENCHMARK RESULTS SUMMARY TABLE (MARKDOWN FORMAT)")
    print("=" * 70)
    print(
        "| Endpoint Scenario | Total Reqs | Concurrency | Throughput (RPS) | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Error Rate |"
    )
    print(
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |"
    )
    for r in results:
        print(
            f"| {r['name']} | {r['total_requests']} | {r['concurrency']} | {r['rps']} | {r['mean_ms']} | {r['p50_ms']} | {r['p95_ms']} | {r['p99_ms']} | {r['error_rate_pct']}% |"
        )
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
