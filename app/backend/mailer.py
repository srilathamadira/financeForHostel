from fastapi_mail import FastMail, MessageSchema
from mail_config import conf


async def send_report(to_email: str, file_path: str):

    message = MessageSchema(
        subject="Monthly Dashboard Report",
        recipients=[to_email],   # ✅ dynamic recipient
        body="Attached is your monthly dashboard report.",
        subtype="plain",
        attachments=[file_path]
    )

    fm = FastMail(conf)
    await fm.send_message(message)
