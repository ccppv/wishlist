"""Email sending service"""
import logging
import ssl
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(email: str, code: str) -> bool:
    """Send verification code to user's email"""
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM
    msg["To"] = email
    msg["Subject"] = f"Код подтверждения: {code}"

    text = f"Ваш код подтверждения: {code}\nКод действителен 10 минут."

    html = f"""\
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Wishlist</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #18181b; margin: 0 0 8px 0; font-size: 20px;">Подтверждение email</h2>
          <p style="color: #71717a; margin: 0 0 24px 0; font-size: 15px;">Введите этот код на странице регистрации:</p>
          <div style="background: #f4f4f5; padding: 20px; text-align: center; border-radius: 12px; margin: 0 0 24px 0;">
            <span style="font-size: 36px; letter-spacing: 10px; font-weight: 700; color: #18181b; font-family: monospace;">{code}</span>
          </div>
          <p style="color: #a1a1aa; font-size: 13px; margin: 0;">Код действителен 10 минут. Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
        </div>
      </div>
    </body>
    </html>"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    host = settings.SMTP_HOST
    port = settings.SMTP_PORT

    try:
        if port == 465:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            smtp_client = aiosmtplib.SMTP(
                hostname=host,
                port=port,
                use_tls=True,
                tls_context=context,
            )
            await smtp_client.connect(server_hostname=host)
        elif port == 587:
            smtp_client = aiosmtplib.SMTP()
            await smtp_client.connect(
                hostname=host,
                port=port,
                start_tls=True,
            )
        else:
            smtp_client = aiosmtplib.SMTP()
            await smtp_client.connect(
                hostname=host,
                port=port,
            )

        if settings.SMTP_USER:
            await smtp_client.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        await smtp_client.send_message(msg)
        await smtp_client.quit()

        logger.info("Verification email sent to %s", email)
        return True
    except Exception as e:
        logger.exception("Email send error to %s: %s", email, e)
        return False
