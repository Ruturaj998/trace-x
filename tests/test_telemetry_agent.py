import pytest
from unittest.mock import patch, MagicMock
import urllib.error

from telemetry_agent.client import TraceXClient
from telemetry_agent.config import TelemetryConfig
from telemetry_agent.gps_adapter import (
    GPSFix,
    ManualInputAdapter,
    LinuxGpsdAdapter,
    SerialNmeaAdapter,
    NetworkGeoAdapter,
    NoHardwareAdapter,
    select_gps_adapter,
)


def test_client_error_handling():
    client = TraceXClient(base_url="http://127.0.0.1:8000", token="dummy-token")

    # 401 Unauthorized
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://127.0.0.1:8000/locations",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"detail": "Invalid or expired token"}'),
        )
        with pytest.raises(PermissionError) as exc_info:
            client.send_location(device_id=1, latitude=18.5, longitude=73.8)
        assert "401" in str(exc_info.value)

    # 403 Forbidden
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://127.0.0.1:8000/locations",
            code=403,
            msg="Forbidden",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"detail": "Access denied"}'),
        )
        with pytest.raises(PermissionError) as exc_info:
            client.send_location(device_id=1, latitude=18.5, longitude=73.8)
        assert "403" in str(exc_info.value)

    # 404 Not Found
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://127.0.0.1:8000/locations",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"detail": "Device not found"}'),
        )
        with pytest.raises(LookupError) as exc_info:
            client.send_location(device_id=99999, latitude=18.5, longitude=73.8)
        assert "404" in str(exc_info.value)

    # 422 Validation Error
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://127.0.0.1:8000/locations",
            code=422,
            msg="Unprocessable Entity",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"detail": "Invalid coordinates"}'),
        )
        with pytest.raises(ValueError) as exc_info:
            client.send_location(device_id=1, latitude=999.0, longitude=73.8)
        assert "422" in str(exc_info.value)

    # Network failure
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = urllib.error.URLError(reason="Connection refused")
        with pytest.raises(ConnectionError) as exc_info:
            client.send_location(device_id=1, latitude=18.5, longitude=73.8)
        assert "Connection refused" in str(exc_info.value)

    # Timeout
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.side_effect = TimeoutError("Timed out")
        with pytest.raises(TimeoutError):
            client.send_location(device_id=1, latitude=18.5, longitude=73.8)


def test_gps_adapters():
    # Manual Input Adapter
    manual = ManualInputAdapter(latitude=18.5204, longitude=73.8567, accuracy=5.0)
    assert manual.is_available() is True
    assert "Real-Hardware" in manual.name()
    fix = manual.get_fix()
    assert fix is not None
    assert fix.latitude == 18.5204
    assert fix.longitude == 73.8567

    # No Hardware Adapter
    no_hw = NoHardwareAdapter()
    assert no_hw.is_available() is False
    with pytest.raises(RuntimeError) as exc:
        no_hw.get_fix()
    assert "No physical GPS hardware" in str(exc.value)

    # Network Geo Adapter
    net_adapter = NetworkGeoAdapter(endpoint_url="http://example.internal/geo")
    assert net_adapter.is_available() is True
    assert "Network Geolocation" in net_adapter.name()

    # Adapter selection
    selected = select_gps_adapter(real_lat=18.0, real_lon=73.0)
    assert isinstance(selected, ManualInputAdapter)

    selected_none = select_gps_adapter(source_preference="auto", serial_port="/non/existent/dev")
    assert isinstance(selected_none, NoHardwareAdapter)
