"""
TRACE-X Edge Telemetry Agent Entrypoint.

Responsible for reading genuine GPS fixes from verified hardware/network interfaces
and transmitting authenticated telemetry to TRACE-X POST /locations endpoint.

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
    print(f"GPS Source Mode   : {config.gps_source.upper()}")
    print(f"Active Adapter    : {adapter_name}")
    print(f"Provider Status   : {'AVAILABLE & READY' if hardware_available else 'NOT DETECTED'}")
    print("-" * 64)
    print("DATA INTEGRITY NOTICE:")
    print("  * Coordinate fabrication and simulation are strictly disabled.")
    print("  * Only genuine telemetry fixes from real hardware/network")
    print("    sources or explicit verified instruments are ingested.")
    print("=" * 64)


def run_agent():
    parser = argparse.ArgumentParser(description="TRACE-X Edge Telemetry Agent")
    parser.add_argument("--check-hardware", action="store_true", help="Inspect and report detected GPS provider")
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

    # Override manual coordinates if specified via CLI flags
    real_lat = args.manual_lat if args.manual_lat is not None else config.real_lat
    real_lon = args.manual_lon if args.manual_lon is not None else config.real_lon
    real_acc = args.manual_acc if args.manual_acc is not None else config.real_acc

    if real_lat is not None and real_lon is not None:
        adapter = ManualInputAdapter(
            latitude=real_lat,
            longitude=real_lon,
            accuracy=real_acc,
        )
    else:
        adapter = select_gps_adapter(
            source_preference=config.gps_source,
            serial_port=config.serial_port,
            serial_baudrate=config.serial_baudrate,
            gpsd_host=config.gpsd_host,
            gpsd_port=config.gpsd_port,
            network_geo_url=config.network_geo_url,
            real_lat=real_lat,
            real_lon=real_lon,
            real_acc=real_acc,
        )

    print_banner(config, adapter.name(), adapter.is_available())

    if args.check_hardware:
        if adapter.is_available():
            print("Status: Hardware/Network interface is available and responsive.")
            sys.exit(0)
        else:
            print("Status: No physical GPS receiver, network source, or gpsd daemon is active.")
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
        print("\n[HARDWARE / SOURCE UNAVAILABLE]")
        print("Cannot transmit telemetry: No physical GPS receiver or verified source is attached.")
        print("TRACE-X strictly rejects fabricated coordinates.")
        print("To run live telemetry:")
        print("  1. Attach a USB/UART GPS module (e.g., /dev/ttyUSB0), OR")
        print("  2. Start gpsd service ('sudo systemctl start gpsd'), OR")
        print("  3. Set GPS_SOURCE=network, OR")
        print("  4. Provide genuine instrument readings via: --manual-lat <LAT> --manual-lon <LON> --once")
        sys.exit(2)

    # Main telemetry loop with exponential backoff & resilience
    print(f"\nStarting telemetry transmission loop (Interval: {config.interval_seconds}s)...")
    current_backoff = 0
    max_backoff = 60

    try:
        while True:
            # 1. Acquire fix from adapter
            try:
                fix = adapter.get_fix()
            except Exception as e:
                print(f"\n[HARDWARE ERROR] Error reading GPS fix: {e}")
                if args.once:
                    sys.exit(1)
                time.sleep(config.interval_seconds)
                continue

            # 2. Check fix availability
            if fix is None:
                print("Awaiting satellite constellation lock or GPS fix...", flush=True)
                if args.once:
                    print("[GPS UNAVAILABLE] No fix locked.")
                    sys.exit(1)
                time.sleep(config.interval_seconds)
                continue

            # 3. Validate coordinates before transmitting
            try:
                fix.validate()
            except ValueError as ve:
                print(f"\n[INVALID FIX REJECTED] GPS fix failed validation: {ve}")
                if args.once:
                    sys.exit(1)
                time.sleep(config.interval_seconds)
                continue

            print(f"Fix acquired: lat={fix.latitude:.6f}, lon={fix.longitude:.6f}, acc={fix.accuracy or 'N/A'}")

            # 4. Transmit fix with 401 retry, 403, 404, 422, timeout handling
            success = False
            try:
                result = client.send_location(
                    device_id=config.device_id,
                    latitude=fix.latitude,
                    longitude=fix.longitude,
                    accuracy=fix.accuracy,
                )
                print(f"  -> Ingestion confirmed by TRACE-X (Record ID: {result.get('id')}, Time: {result.get('timestamp')})")
                success = True
                current_backoff = 0

            except PermissionError as pe:
                err_str = str(pe)
                if "401" in err_str:
                    print("  -> [HTTP 401 UNAUTHORIZED] Access token expired or invalid. Attempting re-authentication...")
                    if config.email and config.password:
                        try:
                            client.authenticate(config.email, config.password)
                            print("  -> Re-authentication successful! Retrying location submission...")
                            result = client.send_location(
                                device_id=config.device_id,
                                latitude=fix.latitude,
                                longitude=fix.longitude,
                                accuracy=fix.accuracy,
                            )
                            print(f"  -> Ingestion confirmed (Record ID: {result.get('id')})")
                            success = True
                            current_backoff = 0
                        except Exception as re_err:
                            print(f"  -> Re-authentication/retry failed: {re_err}")
                    else:
                        print("  -> Cannot re-authenticate: TRACEX_EMAIL and TRACEX_PASSWORD not configured.")
                elif "403" in err_str:
                    print(f"  -> [HTTP 403 FORBIDDEN] Device #{config.device_id} is not accessible with current user account.")
                else:
                    print(f"  -> [PERMISSION ERROR] {pe}")

            except LookupError as le:
                print(f"  -> [HTTP 404 NOT FOUND] Device #{config.device_id} was not found on TRACE-X server: {le}")

            except ValueError as ve:
                print(f"  -> [HTTP 422 UNPROCESSABLE ENTITY] Coordinates rejected by server validation: {ve}")

            except (ConnectionError, TimeoutError) as net_err:
                current_backoff = min(max_backoff, (current_backoff * 2) if current_backoff > 0 else 2)
                print(f"  -> [NETWORK / TIMEOUT ERROR] {net_err}. Backing off for {current_backoff}s...")
                time.sleep(current_backoff)

            except Exception as e:
                print(f"  -> [INGESTION ERROR] Unexpected error: {e}")

            if args.once:
                if not success:
                    sys.exit(1)
                break

            sleep_time = config.interval_seconds if current_backoff == 0 else current_backoff
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\nTelemetry agent stopped by operator.")


if __name__ == "__main__":
    run_agent()
