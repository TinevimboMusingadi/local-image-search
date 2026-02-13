"""Configuration loaded from environment variables for the image search app."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# GCP / Vertex AI
GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "")
GCP_LOCATION: str = os.getenv("GCP_LOCATION", "us-central1")

# ChromaDB
CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")

# Optional: base path for indexing and serving image files (default: project root)
IMAGE_BASE_PATH: str = os.getenv("IMAGE_BASE_PATH", ".")


def get_base_path_resolved() -> Path:
    """Return resolved absolute path for IMAGE_BASE_PATH."""
    return Path(IMAGE_BASE_PATH).resolve()


def validate_config() -> None:
    """Validate that required config is present. Raises ValueError if invalid."""
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise ValueError(
            "GOOGLE_APPLICATION_CREDENTIALS must be set (path to service account JSON)"
        )
    if not os.path.isfile(GOOGLE_APPLICATION_CREDENTIALS):
        raise ValueError(
            "GOOGLE_APPLICATION_CREDENTIALS path is not a file: "
            f"{GOOGLE_APPLICATION_CREDENTIALS}"
        )
    if not GCP_PROJECT_ID:
        raise ValueError("GCP_PROJECT_ID must be set")
    if not GCP_LOCATION:
        raise ValueError("GCP_LOCATION must be set")
