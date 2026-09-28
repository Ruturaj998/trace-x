"""
Configuration module for the TRACE-X Edge Telemetry Agent.
Loads all device, networking, authentication, and GPS provider settings from environment variables.
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class TelemetryConfig:
    api_url: str
    device_id: Optional[int]
    token: Optional[str]
    email: Optional[str]
    password: Optional[str]
    gps_source: str
    serial_port: str
    serial_baudrate: int
    gpsd_host: str
    gpsd_port: int
    network_geo_url: Optional[str]
    real_lat: Optional[float]
    real_lon: Optional[float]
    real_acc: Optional[float]
    interval_seconds: int

    @classmethod
    def from_env(cls) -> "TelemetryConfig":
        raw_device_id = os.getenv("TRACEX_DEVICE_ID")
        device_id = int(raw_device_id) if raw_device_id and raw_device_id.isdigit() else None

        raw_lat = os.getenv("REAL_LATITUDE")
        real_lat = float(raw_lat) if raw_lat else None

        raw_lon = os.getenv("REAL_LONGITUDE")
        real_lon = float(raw_lon) if raw_lon else None

        raw_acc = os.getenv("REAL_ACCURACY")
        real_acc = float(raw_acc) if raw_acc else None

        return cls(
            api_url=os.getenv("TRACEX_API_URL", "http://127.0.0.1:8000").rstrip("/"),
            device_id=device_id,
            token=os.getenv("TRACEX_API_TOKEN"),
            email=os.getenv("TRACEX_EMAIL"),
            password=os.getenv("TRACEX_PASSWORD"),
            gps_source=os.getenv("GPS_SOURCE", "auto").lower(),
            serial_port=os.getenv("GPS_SERIAL_PORT", "/dev/ttyUSB0"),
            serial_baudrate=int(os.getenv("GPS_SERIAL_BAUDRATE", "9600")),
            gpsd_host=os.getenv("GPSD_HOST", "127.0.0.1"),
            gpsd_port=int(os.getenv("GPSD_PORT", "2947")),
            network_geo_url=os.getenv("NETWORK_GEO_URL"),
            real_lat=real_lat,
            real_lon=real_lon,
            real_acc=real_acc,
            interval_seconds=int(os.getenv("TELEMETRY_INTERVAL", "10")),
        )
