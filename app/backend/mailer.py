from fastapi_mail import FastMail, MessageSchema
from mail_config import conf


async def send_report(to_email: str, file_path: str):

    if conf is None or not to_email:
        print("[mail] Skipped: mail not configured or no recipient.")
        return

    message = MessageSchema(
        subject="Monthly Dashboard Report",
        recipients=[to_email],
        body="Attached is your monthly dashboard report.",
        subtype="plain",
        attachments=[file_path]
    )

    fm = FastMail(conf)
    await fm.send_message(message)