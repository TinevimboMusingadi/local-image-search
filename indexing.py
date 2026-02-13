"""Index images from a folder into ChromaDB using Vertex AI embeddings."""

from __future__ import annotations

import hashlib
from pathlib import Path

from chroma_store import add_images, clear_collection
from config import get_base_path_resolved
from embedding import get_image_embedding

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def _resolve_folder_path(folder_path: str) -> Path:
    """Resolve folder_path under the configured base; raise if outside base."""
    base = get_base_path_resolved()
    path = Path(folder_path)
    if not path.is_absolute():
        path = (base / path).resolve()
    else:
        path = path.resolve()
    if not path.is_dir():
        raise ValueError(f"Not a directory: {folder_path}")
    try:
        path.resolve().relative_to(base)
    except ValueError:
        raise ValueError(
            f"Path must be under base path {base}: {path}"
        ) from None
    return path


def _collect_image_paths(folder: Path) -> list[Path]:
    """Return list of image file paths under folder."""
    paths = []
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS:
            paths.append(p)
    return paths


def index_folder(
    folder_path: str,
    collection_name: str = "images",
    clear_first: bool = True,
    dimension: int = 1408,
) -> int:
    """Index all images in a folder into ChromaDB.

    Args:
        folder_path: Path to folder (relative to IMAGE_BASE_PATH or absolute
            under base).
        collection_name: Chroma collection name.
        clear_first: If True, clear the collection before adding.
        dimension: Embedding dimension (must match 1408 for default).

    Returns:
        Number of images indexed.
    """
    folder = _resolve_folder_path(folder_path)
    image_paths = _collect_image_paths(folder)
    if not image_paths:
        if clear_first:
            clear_collection(collection_name=collection_name)
        return 0

    if clear_first:
        clear_collection(collection_name=collection_name)

    ids = []
    embeddings = []
    paths = []
    for p in image_paths:
        path_str = str(p)
        doc_id = hashlib.sha256(path_str.encode()).hexdigest()[:32]
        try:
            emb = get_image_embedding(path_str, dimension=dimension)
        except Exception:
            continue
        ids.append(doc_id)
        embeddings.append(emb)
        paths.append(path_str)

    if ids:
        add_images(ids=ids, embeddings=embeddings, paths=paths,
                   collection_name=collection_name)
    return len(ids)
