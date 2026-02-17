"""FastAPI backend for local image search: index, search, and serve files."""

from __future__ import annotations

import tempfile
from pathlib import Path

# Stub ChromaDB default embedding function so onnxruntime is never loaded (avoids
# DLL error on Windows). We use embedding_function=None and Vertex AI embeddings.
from chromadb_embedding_stub import install_stub

install_stub()

from fastapi import FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import get_base_path_resolved, validate_config
from chroma_store import collection_count, search as chroma_search
from embedding import get_image_embedding, get_text_embedding
from indexing import index_folder

app = FastAPI(title="Local Image Search", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_path_for_serving(path_param: str) -> Path:
    """Resolve path_param under base; raise HTTPException if invalid."""
    base = get_base_path_resolved()
    path = Path(path_param)
    if path.is_absolute():
        path = path.resolve()
    else:
        path = (base / path).resolve()
    try:
        path.resolve().relative_to(base)
    except ValueError:
        raise HTTPException(status_code=403, detail="Path not allowed")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path


class IndexRequest(BaseModel):
    """Request body for POST /index."""

    folder_path: str = "test_photos"
    collection_name: str = "images"


class IndexResponse(BaseModel):
    """Response for POST /index."""

    indexed: int
    collection_name: str


class SearchRequest(BaseModel):
    """Request body for POST /search."""

    query_text: str | None = None
    query_image_path: str | None = None
    top_k: int = 10
    collection_name: str = "images"


class SearchResultItem(BaseModel):
    """Single search result."""

    path: str
    score: float
    rank: int


class SearchResponse(BaseModel):
    """Response for search endpoints."""

    results: list[SearchResultItem]


@app.get("/health")
def health() -> dict:
    """Readiness: validate config and Chroma."""
    try:
        validate_config()
        collection_count()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return {"status": "ok"}


@app.get("/stats")
def stats(collection_name: str = Query("images")) -> dict:
    """Get collection statistics."""
    count = collection_count(collection_name=collection_name)
    return {
        "collection_name": collection_name,
        "total_images": count,
        "embedding_dimension": 1408,
    }


@app.post("/index", response_model=IndexResponse)
def index(request: IndexRequest) -> IndexResponse:
    """Index images in a folder into the default collection."""
    try:
        n = index_folder(
            folder_path=request.folder_path,
            collection_name=request.collection_name,
            clear_first=True,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return IndexResponse(indexed=n, collection_name=request.collection_name)


@app.post("/search", response_model=SearchResponse)
def search_post(request: SearchRequest) -> SearchResponse:
    """Search by text and/or image path."""
    if not request.query_text and not request.query_image_path:
        raise HTTPException(
            status_code=400,
            detail="Provide query_text and/or query_image_path",
        )
    query_embedding = None
    if request.query_text:
        query_embedding = get_text_embedding(request.query_text)
    elif request.query_image_path:
        path = _safe_path_for_serving(request.query_image_path)
        query_embedding = get_image_embedding(str(path))
    if not query_embedding:
        raise HTTPException(status_code=400, detail="Could not compute query embedding")
    hits = chroma_search(
        query_embedding=query_embedding,
        top_k=request.top_k,
        collection_name=request.collection_name,
    )
    results = [
        SearchResultItem(path=h["path"], score=round(h["score"], 4), rank=i + 1)
        for i, h in enumerate(hits)
    ]
    return SearchResponse(results=results)


class BatchSearchRequest(BaseModel):
    """Request body for POST /search/batch."""

    queries: list[str]
    top_k: int = 10
    collection_name: str = "images"


@app.post("/search/batch", response_model=dict)
def search_batch(request: BatchSearchRequest) -> dict:
    """Batch search: multiple text queries at once."""
    if not request.queries or len(request.queries) > 10:
        raise HTTPException(status_code=400, detail="Provide 1-10 queries")
    all_results = {}
    for q in request.queries:
        query_embedding = get_text_embedding(q)
        hits = chroma_search(
            query_embedding=query_embedding,
            top_k=request.top_k,
            collection_name=request.collection_name,
        )
        all_results[q] = [
            {"path": h["path"], "score": round(h["score"], 4), "rank": i + 1}
            for i, h in enumerate(hits)
        ]
    return {"queries": all_results}


@app.get("/search/similar")
def search_similar(
    path: str = Query(...),
    top_k: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    collection_name: str = Query("images"),
) -> SearchResponse:
    """Find images similar to a given indexed image path."""
    safe_path = _safe_path_for_serving(path)
    query_embedding = get_image_embedding(str(safe_path))
    hits = chroma_search(
        query_embedding=query_embedding,
        top_k=top_k * 2,  # Get more to filter by min_score
        collection_name=collection_name,
    )
    filtered = [h for h in hits if h["score"] >= min_score][:top_k]
    results = [
        SearchResultItem(path=h["path"], score=round(h["score"], 4), rank=i + 1)
        for i, h in enumerate(filtered)
    ]
    return SearchResponse(results=results)


@app.get("/search", response_model=SearchResponse)
def search_get(
    q: str = Query(..., min_length=1),
    top_k: int = Query(10, ge=1, le=100),
    collection_name: str = Query("images"),
) -> SearchResponse:
    """Search by text query (GET)."""
    query_embedding = get_text_embedding(q)
    hits = chroma_search(
        query_embedding=query_embedding,
        top_k=top_k,
        collection_name=collection_name,
    )
    results = [
        SearchResultItem(path=h["path"], score=round(h["score"], 4), rank=i + 1)
        for i, h in enumerate(hits)
    ]
    return SearchResponse(results=results)


@app.get("/files")
def serve_file(path: str = Query(..., min_length=1)) -> FileResponse:
    """Serve an indexed image file; path must be under IMAGE_BASE_PATH."""
    safe_path = _safe_path_for_serving(path)
    return FileResponse(safe_path)


# Optional: accept image upload for search (save to temp, embed, query, delete)
@app.post("/search/by-image", response_model=SearchResponse)
async def search_by_upload(
    file: UploadFile,
    top_k: int = Query(10, ge=1, le=100),
    collection_name: str = Query("images"),
) -> SearchResponse:
    """Search using an uploaded image file."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")
    suffix = Path(file.filename or "img").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        query_embedding = get_image_embedding(tmp_path)
        hits = chroma_search(
            query_embedding=query_embedding,
            top_k=top_k,
            collection_name=collection_name,
        )
        results = [
            SearchResultItem(path=h["path"], score=round(h["score"], 4), rank=i + 1)
            for i, h in enumerate(hits)
        ]
        return SearchResponse(results=results)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# Serve frontend static files (mount after routes so /files and /search take precedence)
# Optional: only mount if frontend/ directory exists (for backward compatibility)
# The new Vite frontend runs independently on port 5173
_frontend_dir = Path(__file__).resolve().parent / "frontend"
if _frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dir), html=True), name="frontend")
