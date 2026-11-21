import logging

import pytest

from app.services.email import EmailService
from telemetry_agent.offline_queue import OfflineTelemetryQueue


def test_production_reset_email_failure_keeps_credentials_out_of_logs(
    monkeypatch, caplog, capsys
):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.invalid")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_SSL", "false")
    test_token = "synthetic-reset-token"

    def fail_smtp(*args, **kwargs):
        raise OSError(test_token)

    monkeypatch.setattr("app.services.email.smtplib.SMTP", fail_smtp)
    with caplog.at_level(logging.INFO):
        EmailService.send_password_reset_email("user@example.invalid", test_token)
    assert "Failed to send password reset email via SMTP" in caplog.text
    assert test_token not in caplog.text
    assert test_token not in capsys.readouterr().out


def test_failed_queue_replace_keeps_previous_records(tmp_path, monkeypatch):
    queue_path = tmp_path / "telemetry.json"
    queue = OfflineTelemetryQueue(str(queue_path))
    first_fix = {"latitude": 10, "longitude": 20}
    queue.enqueue(first_fix)

    def fail_replace(*args):
        raise OSError("simulated interruption")

    monkeypatch.setattr("telemetry_agent.offline_queue.os.replace", fail_replace)
    with pytest.raises(OSError, match="simulated interruption"):
        queue.enqueue({"latitude": 11, "longitude": 21})
    assert queue.peek() == [first_fix]
    assert list(tmp_path.iterdir()) == [queue_path]
