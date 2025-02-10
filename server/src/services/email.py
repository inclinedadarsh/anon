import os
from pathlib import Path


def load_email_template(template_name: str, **kwargs):
    """Loads an email template and formats it with provided kwargs."""
    template_path = Path(__file__).parent.parent / "emails" / template_name
    with open(template_path, "r", encoding="utf-8") as file:
        template = file.read()
    
    # Replace placeholders with actual values
    for key, value in kwargs.items():
        template = template.replace(f"{{{{ {key} }}}}", value)
    
    return template