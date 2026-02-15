# Local Image Search

A local multimodal image search app: index images from a folder, then search by **text** or by **image** using Google Vertex AI multimodal embeddings and ChromaDB. The app uses Python 3.12 on the backend and a vanilla JS frontend with a black, silver, white, grey, and cream theme.

## Features

- **Index** a folder of images (e.g. `test_photos`) into ChromaDB with Vertex AI image embeddings.
- **Text search**: describe what you want and get ranked image results.
- **Image search**: upload an image to find similar images in the index.
- **Ranked results** by similarity score.

## Requirements

- **Python 3.12** (3.10+ should work; the plan targets 3.12; Python 3.14 is not yet released).
- A **Google Cloud service account** with Vertex AI enabled (JSON key file in the `key/` directory).
- A GCP project with the Vertex AI API enabled.
- **Windows only**: ChromaDB needs to build a native extension. Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Visual Studio Build Tools, then select "Desktop development with C++" or the C++ build tools workload) so `pip install -r requirements.txt` can complete. If you see `DLL load failed` for onnxruntime when starting the app, install [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) (latest x64) and try again.

## Setup

1. **Clone or open the project** and create a virtual environment:

   ```bash
   python -m venv env
   # Windows
   env\Scripts\activate
   # macOS/Linux
   source env/bin/activate
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:

   - Copy `.env.example` to `.env`.
   - Set the following in `.env`:
     - `GOOGLE_APPLICATION_CREDENTIALS`: path to your GCP service account JSON (e.g. `key/rich-phenomenon-429412-t6-97496af05d96.json`).
     - `GCP_PROJECT_ID`: your GCP project ID.
     - `GCP_LOCATION`: Vertex AI region (e.g. `us-central1`).
     - `CHROMA_PERSIST_DIR`: directory for ChromaDB data (default: `./chroma_data`).
     - Optionally `IMAGE_BASE_PATH`: base path for indexing and serving images (default: project root).

   Do **not** commit `.env` or the contents of `key/`; they are listed in `.gitignore`.

## Run

Activate the venv, then start the backend (the frontend is served from the same process).

**PowerShell (Windows):**

```powershell
.\env\Scripts\Activate.ps1
.\run.ps1
```

Or in one go (no activation needed):

```powershell
.\env\Scripts\python.exe -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**macOS/Linux:**

```bash
source env/bin/activate
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Then open **http://localhost:8000** in your browser.

1. **Index**: Enter a folder path (e.g. `test_photos`) and click **Index images**. The path is relative to the project root (or `IMAGE_BASE_PATH`).
2. **Search**: Use **Text search** to type a query, or **Search by image** to upload an image and find similar indexed images.
3. **Results**: Images are shown in a grid with rank and similarity score; they are loaded via the `/files?path=...` endpoint.

## API

- `GET /health` – readiness (config and Chroma validated).
- `POST /index` – body: `{ "folder_path": "test_photos", "collection_name": "images" }`.
- `GET /search?q=...&top_k=10` – text search.
- `POST /search` – body: `{ "query_text": "...", "query_image_path": "...", "top_k": 10 }`.
- `POST /search/by-image` – multipart file upload for image search.
- `GET /files?path=...` – serve an indexed image (path must be under the base path).

## Project layout

- `api.py` – FastAPI app (index, search, file serving, frontend mount).
- `config.py` – env config and path validation.
- `embedding.py` – Vertex AI multimodal embeddings (image and text).
- `chroma_store.py` – ChromaDB persistent store.
- `indexing.py` – folder scan and index pipeline.
- `frontend/` – static HTML, CSS, JS.
- `key/` – GCP service account JSON (gitignored; add your own).
- `context_file/embedding_context.md` – reference for Gemini/Vertex embeddings.

## Security

- Credentials are read from `.env` and the key file path only; never hardcode secrets.
- Paths for indexing and `/files` are restricted to the configured base path to avoid directory traversal.
