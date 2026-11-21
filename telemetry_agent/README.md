# TRACE-X Edge Telemetry Agent

The TRACE-X Edge Telemetry Agent is a lightweight background daemon designed to run on edge hardware (e.g., Linux single-board computers, vehicular telematics units, field laptops, Raspberry Pi, or IoT gateways). It connects to physical GPS hardware, captures real satellite fixes, and securely streams telemetry to the TRACE-X API.

---

## Telemetry Architecture Flow

```
   ┌────────────────────────────────┐
   │        REAL DEVICE GPS         │
   │  (USB GPS, NMEA UART, gpsd)    │
   └───────────────┬────────────────┘
                   │ GPS Fix (Lat, Lon, Acc)
                   ▼
   ┌────────────────────────────────┐
   │    TRACE-X Telemetry Agent     │
   │  (telemetry_agent/agent.py)    │
   └───────────────┬────────────────┘
                   │ HTTPS with X-Device-Token or Bearer JWT
                   ▼
   ┌────────────────────────────────┐
   │    TRACE-X Backend API         │
   │      POST /locations           │
   └───────────────┬────────────────┘
                   │ Validated & Timezone-Aware UTC Timestamp
                   ▼
   ┌────────────────────────────────┐
   │      PostgreSQL Database       │
   │      ('locations' Table)       │
   └───────────────┬────────────────┘
                   │ Real-time Queries
                   ▼
   ┌────────────────────────────────┐
   │   TRACE-X Dashboard & Maps     │
   │  (Real-Time Breadcrumb Trail)  │
   └────────────────────────────────┘
```

---

## Real Telemetry Integrity Policy

TRACE-X strictly adheres to real data principles:
* **No Coordinate Fabrication**: The agent will never simulate fake "live tracking" or inject random coordinate drift when hardware is absent.
* **Truthful Hardware Detection**: If no physical GPS hardware is found, the agent reports its status truthfully and refuses to fabricate data.
* **Device authentication**: Provision a device token in the dashboard under Device Details → Telemetry Credentials. The token authorizes submissions for that device only. Account JWT authentication is also supported.

---

## Supported GPS Hardware Interfaces

1. **Linux `gpsd` Daemon (`GPS_SOURCE=gpsd`)**:
   Connects to the system GPS daemon via TCP port 2947. Compatible with any device supported by Linux gpsd (USB sticks, Bluetooth GPS, internal WWAN/GNSS modems).
   ```bash
   sudo apt install gpsd gpsd-clients
   sudo systemctl start gpsd
   ```

2. **Serial NMEA Receivers (`GPS_SOURCE=serial`)**:
   Directly reads standard NMEA-0183 `$GPGGA` / `$GNGGA` sentences from `/dev/ttyUSB0`, `/dev/ttyACM0`, or serial UART pins.
   Default baudrate: `9600`.

3. **Field Instrument Manual Entry (`GPS_SOURCE=manual`)**:
   Allows an engineer or field operator to submit a real hardware fix read directly from an external handheld GPS receiver without coordinate simulation.

4. **Network estimate (`GPS_SOURCE=network`)**:
   Uses IP-based geolocation, which can differ substantially from the device's position. If you enable it, supply a trusted HTTPS `NETWORK_GEO_URL` and review that provider's data handling. Use a GPS receiver for hardware tracking.

---

## Configuration

Set these variables in the agent process environment. The agent reads process variables directly:

| Variable | Description | Default |
|---|---|---|
| `TRACEX_API_URL` | Base URL of TRACE-X backend | `http://127.0.0.1:8000` |
| `TRACEX_DEVICE_ID` | Numeric device ID in TRACE-X | *Required* |
| `TRACEX_DEVICE_TOKEN` | Dedicated telemetry credential for the registered device | Recommended |
| `TRACEX_API_TOKEN` | Pre-existing JWT access token | Optional (if email/password provided) |
| `TRACEX_EMAIL` | TRACE-X account email | Optional |
| `TRACEX_PASSWORD` | TRACE-X account password | Optional |
| `GPS_SOURCE` | `auto`, `gpsd`, `serial`, `manual`, or `network` | `auto` |
| `GPS_SERIAL_PORT` | Serial device path | `/dev/ttyUSB0` |
| `GPS_SERIAL_BAUDRATE`| Serial baud rate | `9600` |
| `TELEMETRY_INTERVAL` | Interval between fixes in seconds | `10` |
| `TRACEX_QUEUE_PATH` | Local offline buffer file. Use a distinct path per device | `~/.tracex_telemetry_queue.json` |

Run one agent per queue file. Use a private directory on Windows where access is enforced by the directory ACL. On POSIX the queue file uses mode `0600`. Supply the token through the process environment or your service manager and keep it out of shell history. The queue holds up to 5,000 fixes and evicts the oldest when full.

---

## Usage

### 1. Check Hardware Availability
Inspect available GPS receivers on the host machine:
```bash
python -m telemetry_agent.agent --check-hardware
```

### 2. Run with Environment Variables
```bash
export TRACEX_API_URL="http://127.0.0.1:8000"
export TRACEX_DEVICE_ID=1
# Supply TRACEX_DEVICE_TOKEN through the agent's process environment.

python -m telemetry_agent.agent
```

### 3. Send a Verified Field Reading (Single Fix)
For testing API ingestion using a verified fix read from an external physical GPS instrument:
```bash
python -m telemetry_agent.agent \
  --device-id 1 \
  --manual-lat 18.5204 \
  --manual-lon 73.8567 \
  --manual-acc 5.0 \
  --once
```

### 4. Verify buffering and replay with a physical receiver

1. Attach a GPS receiver, run `python -m telemetry_agent.agent --check-hardware`, and start the agent with the registered device's token.
2. Confirm an initial fix appears for that device on the dashboard.
3. Disconnect the agent host from the API while keeping the receiver active. Confirm the agent reports buffered readings in its local queue.
4. Reconnect and confirm the agent acknowledges the batch, drains its queue, and shows the recovered fixes in device location history in capture order. Replaying a previously acknowledged idempotency key should leave one stored fix.

---

## Connecting External Platforms

* **Android**: An Android background service or Tasker task can invoke `POST /locations` using the device's FusedLocationProviderClient coordinates.
* **IoT / MicroPython / ESP32**: Send JSON directly to `POST /locations` over HTTPS with the JWT bearer token.
