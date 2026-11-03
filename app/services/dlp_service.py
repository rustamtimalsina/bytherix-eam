import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DLPEntity(BaseModel):
    category: str
    masked_placeholder: str
    redacted_preview: str
    start_pos: int
    end_pos: int


class DLPResult(BaseModel):
    original_length: int
    masked_text: str
    is_masked: bool
    entities_detected: List[DLPEntity]
    categories: List[str]
    summary: str


def _luhn_check(number_str: str) -> bool:
    """Validate credit card number using Luhn algorithm."""
    digits = [int(c) for c in number_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0


class DLPShieldService:
    """
    Enterprise Data Loss Prevention (DLP) & PII Masking Shield.
    Safeguards corporate knowledge and LLM prompts against credential leaks,
    payment card data, personal identifiable information, and infrastructure secrets.
    """

    # Compiled high-speed regex matchers
    PATTERNS: Dict[str, re.Pattern] = {
        "OPENAI_API_KEY": re.compile(r"\bsk-[a-zA-Z0-9]{20,}\b"),
        "AWS_ACCESS_KEY": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        "GITHUB_TOKEN": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{36,}\b"),
        "PRIVATE_KEY_BLOCK": re.compile(
            r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
            re.MULTILINE
        ),
        "GENERIC_SECRET_ASSIGNMENT": re.compile(
            r"(?i)\b(?:api[_-]?key|secret|auth[_-]?token|bearer)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{16,})['\"]?"
        ),
        "DATABASE_URI": re.compile(
            r"\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s]+"
        ),
        "PASSWORD_ASSIGNMENT": re.compile(
            r"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*['\"]([^'\"]{4,})['\"]"
        ),
        "CREDIT_CARD": re.compile(
            r"\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b"
        ),
        "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        "EMAIL": re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"),
        "PHONE_NUMBER": re.compile(
            r"(?<![a-zA-Z0-9])(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?![a-zA-Z0-9])"
        ),
    }

    @classmethod
    def scan_and_mask(cls, text: str) -> DLPResult:
        """
        Inspect text for sensitive secrets and PII.
        Replaces each match with a semantic placeholder like [REDACTED_API_KEY_1].
        """
        if not text or not isinstance(text, str):
            return DLPResult(
                original_length=0,
                masked_text="",
                is_masked=False,
                entities_detected=[],
                categories=[],
                summary="No text provided to DLP shield."
            )

        entities: List[DLPEntity] = []
        masked_text = text
        categories_found = set()
        entity_counters: Dict[str, int] = {}

        # 1. Private key blocks (highest priority multiline)
        for match in cls.PATTERNS["PRIVATE_KEY_BLOCK"].finditer(text):
            category = "PRIVATE_KEY"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_PRIVATE_KEY_{entity_counters[category]}]"
            masked_text = masked_text.replace(match.group(0), placeholder)
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview="-----BEGIN...KEY-----",
                start_pos=match.start(),
                end_pos=match.end()
            ))

        # 2. Database connection strings
        for match in cls.PATTERNS["DATABASE_URI"].finditer(text):
            category = "DATABASE_URI"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_DATABASE_URI_{entity_counters[category]}]"
            masked_text = masked_text.replace(match.group(0), placeholder)
            raw = match.group(0)
            preview = raw.split("://")[0] + "://***:***@" + raw.split("@")[-1] if "@" in raw else raw[:15] + "..."
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview=preview,
                start_pos=match.start(),
                end_pos=match.end()
            ))

        # 3. Known API Keys (OpenAI, AWS, GitHub)
        for key_type, pattern in [
            ("OPENAI_API_KEY", cls.PATTERNS["OPENAI_API_KEY"]),
            ("AWS_ACCESS_KEY", cls.PATTERNS["AWS_ACCESS_KEY"]),
            ("GITHUB_TOKEN", cls.PATTERNS["GITHUB_TOKEN"]),
        ]:
            for match in pattern.finditer(text):
                category = "API_KEY"
                categories_found.add(category)
                entity_counters[category] = entity_counters.get(category, 0) + 1
                placeholder = f"[REDACTED_{category}_{entity_counters[category]}]"
                raw = match.group(0)
                masked_text = masked_text.replace(raw, placeholder)
                preview = f"{raw[:4]}****{raw[-4:]}" if len(raw) > 8 else "****"
                entities.append(DLPEntity(
                    category=category,
                    masked_placeholder=placeholder,
                    redacted_preview=preview,
                    start_pos=match.start(),
                    end_pos=match.end()
                ))

        # 4. Generic Secret and Password Assignments
        for match in cls.PATTERNS["PASSWORD_ASSIGNMENT"].finditer(text):
            category = "PASSWORD"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_PASSWORD_{entity_counters[category]}]"
            full_match = match.group(0)
            secret_val = match.group(1)
            replaced = full_match.replace(secret_val, placeholder)
            masked_text = masked_text.replace(full_match, replaced)
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview="********",
                start_pos=match.start(),
                end_pos=match.end()
            ))

        for match in cls.PATTERNS["GENERIC_SECRET_ASSIGNMENT"].finditer(text):
            category = "API_KEY"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_SECRET_{entity_counters[category]}]"
            full_match = match.group(0)
            secret_val = match.group(1)
            replaced = full_match.replace(secret_val, placeholder)
            masked_text = masked_text.replace(full_match, replaced)
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview=f"{secret_val[:3]}...{secret_val[-3:]}",
                start_pos=match.start(),
                end_pos=match.end()
            ))

        # 5. Credit Cards (with Luhn check)
        for match in cls.PATTERNS["CREDIT_CARD"].finditer(text):
            raw = match.group(0)
            cleaned_digits = re.sub(r"[-\s]", "", raw)
            if _luhn_check(cleaned_digits):
                category = "CREDIT_CARD"
                categories_found.add(category)
                entity_counters[category] = entity_counters.get(category, 0) + 1
                placeholder = f"[REDACTED_CARD_{entity_counters[category]}]"
                masked_text = masked_text.replace(raw, placeholder)
                preview = f"****-****-****-{cleaned_digits[-4:]}"
                entities.append(DLPEntity(
                    category=category,
                    masked_placeholder=placeholder,
                    redacted_preview=preview,
                    start_pos=match.start(),
                    end_pos=match.end()
                ))

        # 6. Social Security Numbers (SSN)
        for match in cls.PATTERNS["SSN"].finditer(text):
            raw = match.group(0)
            category = "SSN"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_SSN_{entity_counters[category]}]"
            masked_text = masked_text.replace(raw, placeholder)
            preview = f"***-**-{raw[-4:]}"
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview=preview,
                start_pos=match.start(),
                end_pos=match.end()
            ))

        # 7. Email Addresses
        for match in cls.PATTERNS["EMAIL"].finditer(text):
            raw = match.group(0)
            # Avoid re-masking already generated placeholders like [REDACTED_...]
            if raw.startswith("[REDACTED"):
                continue
            category = "EMAIL"
            categories_found.add(category)
            entity_counters[category] = entity_counters.get(category, 0) + 1
            placeholder = f"[REDACTED_EMAIL_{entity_counters[category]}]"
            masked_text = masked_text.replace(raw, placeholder)
            user_part, domain_part = raw.split("@", 1)
            preview = f"{user_part[:2]}***@{domain_part}"
            entities.append(DLPEntity(
                category=category,
                masked_placeholder=placeholder,
                redacted_preview=preview,
                start_pos=match.start(),
                end_pos=match.end()
            ))

        # 8. Phone Numbers
        for match in cls.PATTERNS["PHONE_NUMBER"].finditer(text):
            raw = match.group(0).strip()
            # Must contain at least 7 digits to prevent matching small dates or ratios
            digits_only = re.sub(r"\D", "", raw)
            if len(digits_only) >= 9:
                category = "PHONE_NUMBER"
                categories_found.add(category)
                entity_counters[category] = entity_counters.get(category, 0) + 1
                placeholder = f"[REDACTED_PHONE_{entity_counters[category]}]"
                masked_text = masked_text.replace(raw, placeholder)
                preview = f"***-***-{digits_only[-4:]}"
                entities.append(DLPEntity(
                    category=category,
                    masked_placeholder=placeholder,
                    redacted_preview=preview,
                    start_pos=match.start(),
                    end_pos=match.end()
                ))

        is_masked = len(entities) > 0
        if is_masked:
            cat_list = ", ".join(sorted(list(categories_found)))
            summary = f"DLP Shield redacted {len(entities)} sensitive item(s) across categories: {cat_list}."
        else:
            summary = "DLP Shield verified: Clean, no secrets or PII detected."

        return DLPResult(
            original_length=len(text),
            masked_text=masked_text,
            is_masked=is_masked,
            entities_detected=entities,
            categories=sorted(list(categories_found)),
            summary=summary
        )

    @classmethod
    def get_supported_detectors(cls) -> List[Dict[str, Any]]:
        """List active DLP detection engines and their descriptions."""
        return [
            {
                "id": "API_KEY",
                "name": "API Keys & Access Tokens",
                "description": "Detects OpenAI (sk-...), AWS (AKIA...), GitHub, and Bearer access tokens.",
                "severity": "CRITICAL",
                "action": "REDACT"
            },
            {
                "id": "PRIVATE_KEY",
                "name": "Private Cryptographic Keys",
                "description": "Intercepts RSA, EC, OpenSSH, and DSA private key certificates.",
                "severity": "CRITICAL",
                "action": "REDACT"
            },
            {
                "id": "DATABASE_URI",
                "name": "Database Connection Strings",
                "description": "Flags credentials inside Postgres, MySQL, MongoDB, and Redis connection URIs.",
                "severity": "HIGH",
                "action": "REDACT"
            },
            {
                "id": "PASSWORD",
                "name": "Plaintext Passwords",
                "description": "Redacts inline configuration passwords and secret assignments.",
                "severity": "HIGH",
                "action": "REDACT"
            },
            {
                "id": "CREDIT_CARD",
                "name": "Payment Card Numbers (PCI-DSS)",
                "description": "Scans and verifies Visa, Mastercard, AMEX, Discover with Luhn checksum.",
                "severity": "CRITICAL",
                "action": "REDACT"
            },
            {
                "id": "SSN",
                "name": "Social Security Numbers",
                "description": "Identifies national identification and tax registration numbers.",
                "severity": "HIGH",
                "action": "REDACT"
            },
            {
                "id": "EMAIL",
                "name": "Corporate & Personal Emails",
                "description": "Masks email addresses to maintain customer data privacy.",
                "severity": "MEDIUM",
                "action": "REDACT"
            },
            {
                "id": "PHONE_NUMBER",
                "name": "Telephone & Mobile Numbers",
                "description": "Anonymizes domestic and international phone numbers.",
                "severity": "MEDIUM",
                "action": "REDACT"
            },
        ]
