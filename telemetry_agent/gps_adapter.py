"""
GPS Hardware and Interface Adapters for TRACE-X Telemetry Agent.

POLICY NOTICE:
Fake coordinates, random coordinate generators, and fabricated simulation
are strictly prohibited. When no GPS hardware or network source is available,
the agent explicitly reports unavailability rather than generating fake fixes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
import os
import socket
from typing import Optional
import urllib.request
import urllib.error


@dataclass
class GPSFix:
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: Optional[datetime] = None

    def validate(self) -> None:
        if self.latitude is None or self.longitude is None:
            raise ValueError("Latitude and Longitude cannot be None")
        if not (math.isfinite(self.latitude) and math.isfinite(self.longitude)):
            raise ValueError(f"Coordinates must be finite numbers: ({self.latitude}, {self.longitude})")
        if not (-90.0 <= self.latitude <= 90.0):
            raise ValueError(f"Latitude out of range [-90, 90]: {self.latitude}")
        if not (-180.0 <= self.longitude <= 180.0):
            raise ValueError(f"Longitude out of range [-180, 180]: {self.longitude}")
        if self.accuracy is not None:
            if not math.isfinite(self.accuracy) or self.accuracy < 0:
                raise ValueError(f"Accuracy must be a non-negative finite number: {self.accuracy}")


class BaseGPSAdapter(ABC):
    """Abstract Base Class for GPS hardware / provider interfaces."""

    @abstractmethod
    def name(self) -> str:
        """Human-readable identifier of the adapter."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if physical hardware / service is accessible."""
        pass

    @abstractmethod
    def get_fix(self) -> Optional[GPSFix]:
        """
        Acquire a real GPS fix.
        Returns GPSFix if successful, or None if awaiting satellite lock.
        """
        pass


class LinuxGpsdAdapter(BaseGPSAdapter):
    """
    Adapter for the standard Linux GPS daemon (gpsd).
    Connects to gpsd TCP socket (default 127.0.0.1:2947) using its native JSON protocol.
    Requires no external C-bindings.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 2947, timeout: float = 2.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    def name(self) -> str:
        return f"Linux gpsd Socket ({self.host}:{self.port})"

    def is_available(self) -> bool:
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout):
                return True
        except (OSError, socket.error):
            return False

    def get_fix(self) -> Optional[GPSFix]:
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as s:
                s_file = s.makefile("r", encoding="utf-8")
                # Send watch command to gpsd
                s.sendall(b'?WATCH={"enable":true,"json":true};\n')

                # Read JSON reports from gpsd stream
                for _ in range(20):
                    line = s_file.readline()
                    if not line:
                        break
                    data = json.loads(line)
                    if data.get("class") == "TPV" and data.get("mode", 0) >= 2:
                        lat = data.get("lat")
                        lon = data.get("lon")
                        if lat is not None and lon is not None:
                            accuracy = data.get("epx") or data.get("epy") or None
                            fix = GPSFix(
                                latitude=float(lat),
                                longitude=float(lon),
                                accuracy=float(accuracy) if accuracy else None,
                                timestamp=datetime.now(timezone.utc),
                            )
                            fix.validate()
                            return fix
        except Exception as e:
            raise RuntimeError(f"Error communicating with gpsd: {e}") from e

        return None


class SerialNmeaAdapter(BaseGPSAdapter):
    """
    Adapter for physical GPS receivers connected via USB/Serial (e.g., u-blox, SIMCOM).
    Reads standard NMEA-0183 sentences ($GPGGA, $GNGGA).
    """

    def __init__(self, port: str = "/dev/ttyUSB0", baudrate: int = 9600):
        self.port = port
        self.baudrate = baudrate

    def name(self) -> str:
        return f"Serial NMEA GPS Device ({self.port})"

    def is_available(self) -> bool:
        return os.path.exists(self.port)

    def get_fix(self) -> Optional[GPSFix]:
        if not self.is_available():
            raise FileNotFoundError(f"Serial GPS device not detected at {self.port}")

        try:
            with open(self.port, "r", encoding="ascii", errors="ignore") as f:
                for _ in range(50):
                    line = f.readline().strip()
                    if line.startswith(("$GPGGA", "$GNGGA")):
                        parts = line.split(",")
                        if len(parts) >= 10 and parts[6] in ("1", "2"):  # Valid GPS fix
                            raw_lat = parts[2]
                            lat_dir = parts[3]
                            raw_lon = parts[4]
                            lon_dir = parts[5]

                            if raw_lat and raw_lon:
                                lat_deg = float(raw_lat[:2]) + float(raw_lat[2:]) / 60.0
                                if lat_dir == "S":
                                    lat_deg = -lat_deg

                                lon_deg = float(raw_lon[:3]) + float(raw_lon[3:]) / 60.0
                                if lon_dir == "W":
                                    lon_deg = -lon_deg

                                hdop = float(parts[8]) if parts[8] else None
                                fix = GPSFix(
                                    latitude=lat_deg,
                                    longitude=lon_deg,
                                    accuracy=hdop * 5.0 if hdop else None,
                                    timestamp=datetime.now(timezone.utc),
                                )
                                fix.validate()
                                return fix
        except Exception as e:
            raise RuntimeError(f"Error reading serial GPS at {self.port}: {e}") from e

        return None


class NetworkGeoAdapter(BaseGPSAdapter):
    """
    Clean provider interface for real network/cellular geolocation or a network GPS receiver endpoint.
    Retrieves genuine network coordinates from a configured source without fabrication.
    """

    def __init__(self, endpoint_url: Optional[str] = None):
        # Default to a reputable network geolocation provider or custom endpoint
        self.endpoint_url = endpoint_url or "http://ip-api.com/json"

    def name(self) -> str:
        return f"Network Geolocation Provider ({self.endpoint_url})"

    def is_available(self) -> bool:
        return bool(self.endpoint_url)

    def get_fix(self) -> Optional[GPSFix]:
        req = urllib.request.Request(
            self.endpoint_url,
            headers={"User-Agent": "TRACE-X-TelemetryAgent/1.0"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            lat = data.get("lat") or data.get("latitude")
            lon = data.get("lon") or data.get("longitude")
            if lat is not None and lon is not None:
                acc = data.get("accuracy") or 500.0  # Network IP fix accuracy
                fix = GPSFix(
                    latitude=float(lat),
                    longitude=float(lon),
                    accuracy=float(acc) if acc else None,
                    timestamp=datetime.now(timezone.utc),
                )
                fix.validate()
                return fix
        except Exception as e:
            raise RuntimeError(f"Error retrieving network location from {self.endpoint_url}: {e}") from e

        return None


class ManualInputAdapter(BaseGPSAdapter):
    """
    Adapter for genuine manual entry from an external handheld GPS receiver or field instrument.
    Does NOT fabricate data; requires the operator or environment to provide real coordinates.
    """

    def __init__(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        accuracy: Optional[float] = None,
    ):
        self.preset_lat = latitude
        self.preset_lon = longitude
        self.preset_acc = accuracy

    def name(self) -> str:
        return "Real-Hardware Field Instrument Entry"

    def is_available(self) -> bool:
        return True

    def get_fix(self) -> Optional[GPSFix]:
        if self.preset_lat is not None and self.preset_lon is not None:
            fix = GPSFix(
                latitude=self.preset_lat,
                longitude=self.preset_lon,
                accuracy=self.preset_acc,
                timestamp=datetime.now(timezone.utc),
            )
            fix.validate()
            return fix

        print("\n[Manual Real GPS Fix Input]")
        print("Note: Values must be read directly from a real hardware instrument or GPS device.")
        raw_lat = input("Enter real Latitude [-90.0 to 90.0]: ").strip()
        raw_lon = input("Enter real Longitude [-180.0 to 180.0]: ").strip()
        raw_acc = input("Enter estimated Accuracy in meters (optional, Enter to skip): ").strip()

        if not raw_lat or not raw_lon:
            return None

        lat = float(raw_lat)
        lon = float(raw_lon)
        acc = float(raw_acc) if raw_acc else None

        fix = GPSFix(latitude=lat, longitude=lon, accuracy=acc, timestamp=datetime.now(timezone.utc))
        fix.validate()
        return fix


class NoHardwareAdapter(BaseGPSAdapter):
    """
    Fallback adapter when no physical GPS receiver, network source, or daemon is detected.
    Strictly refuses to fabricate fake data.
    """

    def name(self) -> str:
        return "No Hardware Detected (Truthful Fallback)"

    def is_available(self) -> bool:
        return False

    def get_fix(self) -> Optional[GPSFix]:
        raise RuntimeError(
            "No physical GPS hardware detected on this host. "
            "TRACE-X strictly adheres to real telemetry integrity. "
            "To transmit live GPS data, attach a USB/UART GPS receiver (e.g. /dev/ttyUSB0), "
            "run gpsd ('sudo systemctl start gpsd'), enable NETWORK_GEO_URL, or use genuine instrument readings."
        )


def select_gps_adapter(
    source_preference: str = "auto",
    serial_port: str = "/dev/ttyUSB0",
    serial_baudrate: int = 9600,
    gpsd_host: str = "127.0.0.1",
    gpsd_port: int = 2947,
    network_geo_url: Optional[str] = None,
    real_lat: Optional[float] = None,
    real_lon: Optional[float] = None,
    real_acc: Optional[float] = None,
) -> BaseGPSAdapter:
    """
    Inspects system environment and selects an appropriate real GPS adapter.
    """
    if real_lat is not None and real_lon is not None:
        return ManualInputAdapter(latitude=real_lat, longitude=real_lon, accuracy=real_acc)

    if source_preference == "gpsd":
        return LinuxGpsdAdapter(host=gpsd_host, port=gpsd_port)
    elif source_preference in ("serial", "nmea"):
        return SerialNmeaAdapter(port=serial_port, baudrate=serial_baudrate)
    elif source_preference == "network":
        return NetworkGeoAdapter(endpoint_url=network_geo_url)
    elif source_preference == "manual":
        return ManualInputAdapter(latitude=real_lat, longitude=real_lon, accuracy=real_acc)

    # Automatic hardware discovery
    gpsd_adapter = LinuxGpsdAdapter(host=gpsd_host, port=gpsd_port)
    if gpsd_adapter.is_available():
        return gpsd_adapter

    serial_adapter = SerialNmeaAdapter(port=serial_port, baudrate=serial_baudrate)
    if serial_adapter.is_available():
        return serial_adapter

    # If network geo is explicitly configured
    if network_geo_url:
        return NetworkGeoAdapter(endpoint_url=network_geo_url)

    # No hardware found
    return NoHardwareAdapter()
