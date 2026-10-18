import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig

# load backend/.env no matter where uvicorn is started from
load_dotenv(Path(__file__).parent / ".env")

_required = ["MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM", "MAIL_SERVER"]
_missing = [k for k in _required if not os.getenv(k)]

if _missing:
    # Mail is optional: server still starts, reports just won't be emailed
    print(f"[mail] Not configured (missing: {', '.join(_missing)}). Email sending disabled.")
    conf = None
else:
    conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_FROM=os.getenv("MAIL_FROM"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_SERVER=os.getenv("MAIL_SERVER"),
        MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True") == "True",
        MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False") == "True",
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )