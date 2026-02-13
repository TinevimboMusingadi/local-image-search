"""ChromaDB persistent store for image embeddings."""

from __future__ import annotations

from collections.abc import Sequence

import chromadb
from chromadb.config import Settings

from config import CHROMA_PERSIST_DIR

# Default collection name for the single-session design
DEFAULT_COLLECTION_NAME = "images"

# Embedding dimension from Vertex AI multimodal model
EMBEDDING_DIMENSION = 1408

_chroma_client: chromadb.PersistentClient | None = None


def _get_client() -> chromadb.PersistentClient:
    """Return the persistent Chroma client, creating it if needed."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_or_create_collection(
    name: str = DEFAULT_COLLECTION_NAME,
) -> chromadb.Collection:
    """Get or create a collection. No embedding function; we supply embeddings."""
    client = _get_client()
    return client.get_or_create_collection(
        name=name,
        embedding_function=None,
        metadata={"hnsw:space": "cosine"},
    )


def add_images(
    ids: Sequence[str],
    embeddings: Sequence[list[float]],
    paths: Sequence[str],
    collection_name: str = DEFAULT_COLLECTION_NAME,
) -> None:
    """Add image embeddings to the collection.

    Args:
        ids: Unique ids (e.g. path hash or uuid).
        embeddings: List of 1408-dim vectors from Vertex AI.
        paths: Image file paths for metadata.
        collection_name: Target collection name.
    """
    if len(ids) != len(embeddings) or len(ids) != len(paths):
        raise ValueError("ids, embeddings, and paths must have the same length")
    coll = get_or_create_collection(name=collection_name)
    metadatas = [{"path": p} for p in paths]
    coll.add(
        ids=list(ids),
        embeddings=list(embeddings),
        metadatas=metadatas,
    )


def search(
    query_embedding: list[float],
    top_k: int = 10,
    collection_name: str = DEFAULT_COLLECTION_NAME,
) -> list[dict]:
    """Search for nearest images by embedding.

    Args:
        query_embedding: Query vector (text or image embedding).
        top_k: Number of results to return.
        collection_name: Collection to search.

    Returns:
        List of dicts with keys: id, path, distance, score.
        score is 1 - distance for cosine so higher = more similar.
    """
    coll = get_or_create_collection(name=collection_name)
    n = coll.count()
    if n == 0:
        return []
    result = coll.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, n),
        include=["metadatas", "distances"],
    )
    if not result["ids"] or not result["ids"][0]:
        return []
    ids = result["ids"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]
    # Cosine distance in Chroma: 0 = identical, 2 = opposite. Convert to similarity.
    return [
        {
            "id": doc_id,
            "path": meta["path"] if meta else "",
            "distance": dist,
            "score": 1.0 - dist if dist is not None else 0.0,
        }
        for doc_id, meta, dist in zip(ids, metadatas, distances)
    ]


def clear_collection(collection_name: str = DEFAULT_COLLECTION_NAME) -> None:
    """Delete and recreate the collection (removes all documents)."""
    client = _get_client()
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass
    get_or_create_collection(name=collection_name)


def collection_count(collection_name: str = DEFAULT_COLLECTION_NAME) -> int:
    """Return the number of documents in the collection."""
    coll = get_or_create_collection(name=collection_name)
    return coll.count()
