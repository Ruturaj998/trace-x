import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("tracex.email")


class EmailService:
    @staticmethod
    def send_password_reset_email(email: str, token: str) -> None:
        """
        Sends a password reset email.
        In development / local mode, logs the reset link and token.
        When SMTP environment variables are configured, dispatches via SMTP.
        """
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?token={token}"

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_tls = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
        smtp_ssl = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")
        email_from = os.getenv("EMAIL_FROM", "noreply@tracex.internal")

        # Production SMTP dispatch
        if smtp_host:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "TRACE-X Security: Password Reset Request"
                msg["From"] = email_from
                msg["To"] = email

                text_content = (
                    f"Hello,\n\n"
                    f"A password reset request was initiated for your TRACE-X account.\n\n"
                    f"Reset Link: {reset_link}\n\n"
                    f"This link is valid for 1 hour and can only be used once.\n"
                    f"If you did not make this request, you can safely ignore this email.\n\n"
                    f"TRACE-X Command Center"
                )

                html_content = f"""
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f17; color: #e2e8f0; padding: 30px;">
                    <div style="max-width: 520px; margin: 0 auto; background: #131b26; border: 1px solid #1e293b; border-radius: 8px; padding: 28px;">
                        <h2 style="color: #38bdf8; margin-top: 0;">TRACE-X Security</h2>
                        <p style="font-size: 14px; color: #94a3b8;">A password reset was requested for your account (<strong>{email}</strong>).</p>
                        <div style="margin: 24px 0; text-align: center;">
                            <a href="{reset_link}" style="display: inline-block; background: #38bdf8; color: #0b0f17; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">RESET PASSWORD</a>
                        </div>
                        <p style="font-size: 12px; color: #64748b;">Or copy this link into your browser:<br/><span style="word-break: break-all; color: #38bdf8;">{reset_link}</span></p>
                        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This link will expire in 60 minutes. If you did not request this, no action is needed.</p>
                    </div>
                </body>
                </html>
                """

                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                if smtp_ssl:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                        if smtp_user and smtp_password:
                            server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                        if smtp_tls:
                            server.starttls()
                        if smtp_user and smtp_password:
                            server.login(smtp_user, smtp_password)
                        server.send_message(msg)

                logger.info(f"Password reset email sent successfully via SMTP to {email}")
                return
            except Exception as e:
                logger.error(f"Failed to dispatch reset email via SMTP to {email}: {e}")
                # Fall through to logging for resilience in non-fatal paths

        # Development / Fallback mode
        logger.info(
            f"[DEVELOPMENT EMAIL DISPATCH]\n"
            f"  Recipient  : {email}\n"
            f"  Reset Link : {reset_link}\n"
            f"  Token      : {token}\n"
            f"  Valid For  : 60 minutes"
        )
        print(f"\n========================================================")
        print(f"[TRACE-X DEV EMAIL SERVICE]")
        print(f"To: {email}")
        print(f"Password Reset Link: {reset_link}")
        print(f"Token: {token}")
        print(f"========================================================\n")
