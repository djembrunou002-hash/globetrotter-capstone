import re

PHONE_COUNTRY_CODE = "+237"
PHONE_LOCAL_DIGITS = 9

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class Identifier:
    """
    Normalizes the (email, number) pair sent by the client into a single
    identifier. Email always wins when both are provided, matching the
    "prioritize email if both are inputted" rule.
    """

    KIND_EMAIL = "email"
    KIND_PHONE = "phone"

    def __init__(self, kind, value):
        self.kind = kind
        self.value = value

    def is_email(self):
        return self.kind == self.KIND_EMAIL

    def is_phone(self):
        return self.kind == self.KIND_PHONE

    def as_user_fields(self):
        """Returns the (email, number) tuple to store on a user record."""
        if self.is_email():
            return self.value, None
        return None, self.value

    @classmethod
    def parse(cls, email=None, number=None):
        email = (email or "").strip()
        number = (number or "").strip()

        if email:
            if not EMAIL_REGEX.match(email):
                raise ValueError("Enter a valid email address")
            return cls(cls.KIND_EMAIL, email.lower())

        if number:
            return cls(cls.KIND_PHONE, cls._normalize_phone(number))

        raise ValueError("Provide an email or a phone number")

    @staticmethod
    def _normalize_phone(number):
        digits = re.sub(r"\D", "", number)
        if digits.startswith("237") and len(digits) > PHONE_LOCAL_DIGITS:
            digits = digits[3:]
        if len(digits) != PHONE_LOCAL_DIGITS:
            raise ValueError("Phone number must be exactly 9 digits")
        return f"{PHONE_COUNTRY_CODE}{digits}"

    def matches_user(self, user) -> bool:
        if self.is_email():
            return bool(user.get("email")) and user["email"].lower() == self.value
        return user.get("number") == self.value