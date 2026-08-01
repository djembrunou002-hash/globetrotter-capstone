import logging

import requests
from flask import current_app

logger = logging.getLogger("brevo")

EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
SMS_ENDPOINT = "https://api.brevo.com/v3/transactionalSMS/sms"


class BrevoService:
    """
    Thin wrapper around Brevo's transactional Email and SMS APIs.

    Dev fallback: if BREVO_API_KEY is not configured, nothing is actually
    sent over the network. Instead the code is logged to the console and
    `dev_mode` is reported as True so callers (routes/auth.py) can echo
    the code back in the JSON response for easy local testing. As soon as
    a real BREVO_API_KEY is set, this fallback stops applying.
    """

    def __init__(self):
        self.api_key = current_app.config.get("BREVO_API_KEY", "")
        self.sender_email = current_app.config.get("BREVO_SENDER_EMAIL")
        self.sender_name = current_app.config.get("BREVO_SENDER_NAME")
        self.sms_sender = current_app.config.get("BREVO_SMS_SENDER")

    @property
    def dev_mode(self) -> bool:
        return not bool(self.api_key)

    def _headers(self):
        return {
            "accept": "application/json",
            "api-key": self.api_key,
            "content-type": "application/json",
        }

    # -----------------------------------------------------------
    # EMAIL
    # -----------------------------------------------------------
    def send_otp_email(self, to_email: str, to_name: str, code: str, purpose: str) -> bool:
        subject, html = self._otp_email_content(to_name, code, purpose)

        if self.dev_mode:
            logger.warning("[DEV OTP] email=%s code=%s purpose=%s", to_email, code, purpose)
            return True

        payload = {
            "sender": {"email": self.sender_email, "name": self.sender_name},
            "to": [{"email": to_email, "name": to_name or to_email}],
            "subject": subject,
            "htmlContent": html,
        }
        try:
            resp = requests.post(EMAIL_ENDPOINT, json=payload, headers=self._headers(), timeout=10)
            if resp.status_code >= 300:
                logger.error("Brevo email send failed (%s): %s", resp.status_code, resp.text)
                return False
            return True
        except requests.RequestException as e:
            logger.error("Brevo email send error: %s", e)
            return False

    @staticmethod
    def _otp_email_content(name, code, purpose):
        if purpose == "reset":
            subject = "Your GlobalTrotter password reset code"
            heading = "Reset your password"
        else:
            subject = "Your GlobalTrotter verification code"
            heading = "Verify your account"

        html = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
          <h2>{heading}</h2>
          <p>Hi {name or 'there'},</p>
          <p>Your code is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{code}</p>
          <p>This code expires in a few minutes. If you didn't request this, you can ignore this email.</p>
        </div>
        """
        return subject, html

    # -----------------------------------------------------------
    # SMS
    # -----------------------------------------------------------
    def send_otp_sms(self, to_number: str, code: str, purpose: str) -> bool:
        message = self._otp_sms_content(code, purpose)

        if self.dev_mode:
            logger.warning("[DEV OTP] phone=%s code=%s purpose=%s", to_number, code, purpose)
            return True

        payload = {
            "sender": self.sms_sender,
            "recipient": to_number.replace("+", ""),
            "content": message,
            "type": "transactional",
        }
        try:
            resp = requests.post(SMS_ENDPOINT, json=payload, headers=self._headers(), timeout=10)
            if resp.status_code >= 300:
                logger.error("Brevo SMS send failed (%s): %s", resp.status_code, resp.text)
                return False
            return True
        except requests.RequestException as e:
            logger.error("Brevo SMS send error: %s", e)
            return False

    @staticmethod
    def _otp_sms_content(code, purpose):
        if purpose == "reset":
            return f"GlobalTrotter password reset code: {code}. Expires shortly."
        return f"GlobalTrotter verification code: {code}. Expires shortly."

    # -----------------------------------------------------------
    # DISPATCH (picks email or SMS based on the identifier kind)
    # -----------------------------------------------------------
    def send_otp(self, identifier, name: str, code: str, purpose: str) -> bool:
        if identifier.is_email():
            return self.send_otp_email(identifier.value, name, code, purpose)
        return self.send_otp_sms(identifier.value, code, purpose)

    @staticmethod
    def channel_name(identifier) -> str:
        return "email" if identifier.is_email() else "phone"