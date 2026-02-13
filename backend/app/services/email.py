"""Email sending service"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


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

    try:
        smtp_kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
        }

        # Auth if provided
        if settings.SMTP_USER:
            smtp_kwargs["username"] = settings.SMTP_USER
            smtp_kwargs["password"] = settings.SMTP_PASSWORD

        # TLS mode based on port
        if settings.SMTP_PORT == 465:
            smtp_kwargs["use_tls"] = True
            smtp_kwargs["validate_certs"] = False
        elif settings.SMTP_PORT == 587:
            smtp_kwargs["start_tls"] = True
            smtp_kwargs["validate_certs"] = False
        # port 25: plain SMTP, no TLS

        await aiosmtplib.send(msg, **smtp_kwargs)
        print(f"✅ Verification email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Email send error to {email}: {e}")
        return False
