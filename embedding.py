"""Vertex AI multimodal embeddings for images and text."""

from __future__ import annotations

import vertexai
from vertexai.vision_models import Image as VertexImage
from vertexai.vision_models import MultiModalEmbeddingModel

from config import GCP_LOCATION, GCP_PROJECT_ID, validate_config

# Lazy-initialized model
_mm_model: MultiModalEmbeddingModel | None = None


def _get_model() -> MultiModalEmbeddingModel:
    """Return the multimodal embedding model, initializing Vertex and model if needed."""
    global _mm_model
    if _mm_model is None:
        validate_config()
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        _mm_model = MultiModalEmbeddingModel.from_pretrained("multimodalembedding")
    return _mm_model


def get_image_embedding(image_path: str, dimension: int = 1408) -> list[float]:
    """Generate an image embedding from a local file path.

    Args:
        image_path: Path to the image file (local path).
        dimension: Embedding dimension (128, 256, 512, or 1408).

    Returns:
        A list of floats (embedding vector).
    """
    model = _get_model()
    image = VertexImage.load_from_file(image_path)
    embedding = model.get_embeddings(image=image, dimension=dimension)
    return list(embedding.image_embedding)


def get_text_embedding(text: str, dimension: int = 1408) -> list[float]:
    """Generate a text embedding for use in text-to-image search.

    Args:
        text: Query or contextual text.
        dimension: Embedding dimension (128, 256, 512, or 1408).

    Returns:
        A list of floats (embedding vector).
    """
    model = _get_model()
    embedding = model.get_embeddings(
        contextual_text=text,
        dimension=dimension,
    )
    return list(embedding.text_embedding)
