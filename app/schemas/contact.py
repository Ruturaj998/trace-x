from pydantic import BaseModel, EmailStr, Field, field_validator


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., max_length=255)
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=10, max_length=3000)
    # Honeypot field: Legitimate users will leave this empty as it is hidden via CSS/tabIndex=-1.
    # Spam bots scanning DOM inputs often populate all fields.
    honeypot: str | None = Field(default="", max_length=100)

    @field_validator("name", "subject", "message")
    @classmethod
    def strip_and_validate(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("Field cannot be empty or only whitespace")
        # Check for harmful script tags or control characters
        if "<script" in clean.lower():
            raise ValueError("Invalid content detected")
        return clean


class ContactResponse(BaseModel):
    status: str
    message: str
