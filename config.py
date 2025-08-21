# config.py
# -----------------------------------------------------------------------------
# Centralised configuration for the Westbridge Outreach Tooling Flask app
# -----------------------------------------------------------------------------
import os
from pathlib import Path
from datetime import timedelta

# Root of the project
BASE_DIR = Path(__file__).resolve().parent

# Where temporary PPTX/PDF files are written
DEFAULT_TEMP_DIR = BASE_DIR / "generated"
DEFAULT_TEMP_DIR.mkdir(exist_ok=True)

class BaseConfig:
    """Settings common to all environments."""
    # ── Core ────────────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "change‑me‑in‑production")
    DEBUG = False

    # ── File paths ─────────────────────────────────────────────────────────
    TEMPLATE_PPTX = os.getenv(
        "TEMPLATE_PPTX",
        str(BASE_DIR / "Unbound and WB Capital.pptx")
    )
    TEMP_DIR = Path(os.getenv("TEMP_DIR", DEFAULT_TEMP_DIR))

    # ── Microsoft Graph / Outlook OAuth ────────────────────────────────────
    OUTLOOK_CLIENT_ID     = os.getenv("OUTLOOK_CLIENT_ID")     # REQUIRED
    OUTLOOK_CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET") # REQUIRED
    OUTLOOK_TENANT_ID     = os.getenv("OUTLOOK_TENANT_ID", "common")     # Default to 'common' for multi-tenant

    # Use 'common' for multi-tenant, 'consumers' for personal accounts only, or specific tenant ID
    AUTHORITY      = f"https://login.microsoftonline.com/{OUTLOOK_TENANT_ID}"
    OUTLOOK_SCOPES = ["https://graph.microsoft.com/Mail.Send"]
    REDIRECT_PATH  = "/auth/callback"   # Must match Azure Portal

    # ── Session storage ────────────────────────────────────────────────────
    # Session type is now determined dynamically in app.py based on DATABASE_URL
    SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")  # Used only for development fallback
    # Use a more persistent directory for session storage (development only)
    SESSION_FILE_DIR = os.getenv("SESSION_FILE_DIR", str(BASE_DIR / "flask_session"))
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = 'westbridge:'
    PERMANENT_SESSION_LIFETIME = timedelta(days=14)
    
    # Session cookie settings
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_NAME = 'westbridge_session'
    
    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL = os.getenv("DATABASE_URL")  # PostgreSQL connection string from Fly.io

    # ── 3rd‑party API keys used elsewhere in the code ──────────────────────
    BROWSERBASE_API_KEY    = os.getenv("BROWSERBASE_API_KEY")
    BROWSERBASE_PROJECT_ID = os.getenv("BROWSERBASE_PROJECT_ID")
    ANTHROPIC_API_KEY      = os.getenv("ANTHROPIC_API_KEY")

    # Placeholder – set to your own mailbox if you ever need a default
    OUTLOOK_EMAIL = os.getenv("OUTLOOK_EMAIL")

    @staticmethod
    def init_app(app):
        """Hook for any app‑wide initialisation."""
        # Ensure TEMP_DIR exists
        app.logger.info(f"TEMP_DIR = {app.config['TEMP_DIR']}")
        Path(app.config["TEMP_DIR"]).mkdir(exist_ok=True)


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    # Production session settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_SECURE = True
    SESSION_PERMANENT = True
    # Ensure proper session cookie domain for production
    SESSION_COOKIE_DOMAIN = None  # Let Flask determine from request
    SESSION_COOKIE_PATH = '/'


# Map names used by create_app()
config = {
    "development": DevelopmentConfig,
    "production" : ProductionConfig,
    "default"    : DevelopmentConfig
}
