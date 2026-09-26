"""
TRACE-X Edge Telemetry Agent Entrypoint.

Responsible for reading GPS fixes from verified hardware interfaces and
transmitting authenticated telemetry to TRACE-X POST /locations endpoint.

STRICT POLICY:
Simulation, random walk, and coordinate fabrication are prohibited.
"""

import argparse
import sys
import time

from telemetry_agent.client import TraceXClient
from telemetry_agent.config import TelemetryConfig
from telemetry_agent.gps_adapter import (
    ManualInputAdapter,
    NoHardwareAdapter,
    select_gps_adapter,
)


def print_banner(config: TelemetryConfig, adapter_name: str, hardware_available: bool):
    print("=" * 64)
    print("  TRACE-X EDGE TELEMETRY AGENT — HARDWARE INTEGRATION")
    print("=" * 64)
    print(f"Target API URL    : {config.api_url}")
    print(f"Device ID         : {config.device_id or 'Not specified'}")
    print(f"GPS Hardware Mode : {config.gps_source.upper()}")
    print(f"Active Adapter    : {adapter_name}")
    print(f"Hardware Status   : {'CONNECTED & READY' if hardware_available else 'NO HARDWARE DETECTED'}")
    print("-" * 64)
    print("DATA INTEGRITY NOTICE:")
    print("  * Coordinate fabrication and simulation are disabled.")
    print("  * Only genuine telemetry fixes from real hardware or")
    print("    explicit real field instruments are ingested.")
    print("=" * 64)


def run_agent():
    parser = argparse.ArgumentParser(description="TRACE-X Edge Telemetry Agent")
    parser.add_argument("--check-hardware", action="store_true", help="Inspect and report detected GPS hardware")
    parser.add_argument("--once", action="store_true", help="Send a single fix and exit")
    parser.add_argument("--device-id", type=int, help="Override TRACEX_DEVICE_ID")
    parser.add_argument("--interval", type=int, help="Override TELEMETRY_INTERVAL (seconds)")
    parser.add_argument("--manual-lat", type=float, help="Explicit real latitude read from hardware instrument")
    parser.add_argument("--manual-lon", type=float, help="Explicit real longitude read from hardware instrument")
    parser.add_argument("--manual-acc", type=float, help="Explicit real accuracy in meters read from instrument")

    args = parser.parse_args()

    config = TelemetryConfig.from_env()
    if args.device_id:
        config.device_id = args.device_id
    if args.interval:
        config.interval_seconds = args.interval

    # Handle manual hardware values if explicitly provided via CLI
    if args.manual_lat is not None and args.manual_lon is not None:
        adapter = ManualInputAdapter(
            latitude=args.manual_lat,
            longitude=args.manual_lon,
            accuracy=args.manual_acc,
        )
    else:
        adapter = select_gps_adapter(
            source_preference=config.gps_source,
            serial_port=config.serial_port,
            serial_baudrate=config.serial_baudrate,
            gpsd_host=config.gpsd_host,
            gpsd_port=config.gpsd_port,
        )

    print_banner(config, adapter.name(), adapter.is_available())

    if args.check_hardware:
        if adapter.is_available():
            print("Status: Hardware interface is available and responsive.")
            sys.exit(0)
        else:
            print("Status: No physical GPS receiver or gpsd daemon is active.")
            print("Refer to telemetry_agent/README.md for hardware hookup instructions.")
            sys.exit(1)

    # Validate device ID
    if not config.device_id:
        print("\n[ERROR] Device ID is required. Set TRACEX_DEVICE_ID in environment or use --device-id.")
        sys.exit(1)

    # Initialize API Client and Authenticate
    client = TraceXClient(base_url=config.api_url, token=config.token)
    if not client.token:
        if config.email and config.password:
            print(f"Authenticating with TRACE-X as {config.email}...")
            try:
                client.authenticate(config.email, config.password)
                print("Authentication successful. Bearer token acquired.")
            except Exception as e:
                print(f"[AUTH ERROR] Failed to authenticate: {e}")
                sys.exit(1)
        else:
            print("\n[ERROR] Authentication required. Provide TRACEX_API_TOKEN or TRACEX_EMAIL + TRACEX_PASSWORD.")
            sys.exit(1)

    if isinstance(adapter, NoHardwareAdapter):
        print("\n[HARDWARE UNAVAILABLE]")
        print("Cannot transmit telemetry: No physical GPS receiver is attached to this machine.")
        print("TRACE-X strictly rejects fabricated coordinates.")
        print("To test live telemetry ingestion:")
        print("  1. Attach a USB/UART GPS module (e.g., /dev/ttyUSB0), OR")
        print("  2. Start gpsd service, OR")
        print("  3. Pass genuine instrument readings via: --manual-lat <LAT> --manual-lon <LON> --once")
        sys.exit(2)

    # Main telemetry loop
    print(f"\nStarting telemetry transmission loop (Interval: {config.interval_seconds}s)...")
    try:
        while True:
            print("Acquiring GPS fix from hardware...", end=" ", flush=True)
            try:
                fix = adapter.get_fix()
            except Exception as e:
                print(f"\n[HARDWARE ERROR] {e}")
                if args.once:
                    sys.exit(1)
                time.sleep(config.interval_seconds)
                continue

            if fix is None:
                print("Awaiting satellite constellation lock...")
            else:
                print(f"Fix acquired: lat={fix.latitude:.6f}, lon={fix.longitude:.6f}, acc={fix.accuracy or 'N/A'}")
                try:
                    result = client.send_location(
                        device_id=config.device_id,
                        latitude=fix.latitude,
                        longitude=fix.longitude,
                        accuracy=fix.accuracy,
                    )
                    print(f"  -> Ingestion confirmed by TRACE-X (Record ID: {result.get('id')}, Time: {result.get('timestamp')})")
                except Exception as e:
                    print(f"  -> Ingestion failed: {e}")

            if args.once:
                break

            time.sleep(config.interval_seconds)

    except KeyboardInterrupt:
        print("\nTelemetry agent stopped by operator.")


if __name__ == "__main__":
    run_agent()
