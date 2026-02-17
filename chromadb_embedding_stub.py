"""
Stub ChromaDB embedding_functions so we never load onnxruntime (DLL fails on some Windows).

We use embedding_function=None and supply our own embeddings from Vertex AI, so the
default embedding function is never used. This module is imported before chromadb
and injects a fake embedding_functions module to avoid the onnxruntime import.
"""

from __future__ import annotations

import sys
import types
from typing import Any


class _StubEmbeddingFunction:
    """Minimal embedding function stub; we use custom embeddings only."""

    def __call__(self, input: Any) -> list[list[float]]:
        raise NotImplementedError("Use embedding_function=None and supply embeddings.")


def _DefaultEmbeddingFunction() -> _StubEmbeddingFunction:
    """Stub for ChromaDB's default; avoids loading onnxruntime."""
    return _StubEmbeddingFunction()


def _create_stub_module() -> types.ModuleType:
    """Build a fake chromadb.utils.embedding_functions module."""
    mod = types.ModuleType("chromadb.utils.embedding_functions")
    mod.DefaultEmbeddingFunction = _DefaultEmbeddingFunction
    mod.ONNXMiniLM_L6_V2 = _DefaultEmbeddingFunction  # alias if referenced
    return mod


class _ChromaEmbeddingStubFinder:
    """Import finder that provides our stub for chromadb.utils.embedding_functions."""

    def find_module(self, fullname: str, path: Any = None) -> None:
        return None

    def find_spec(self, fullname: str, path: Any = None, target: Any = None) -> None:
        return None


class _ChromaEmbeddingStubLoader:
    """Loader that returns the stub module."""

    def __init__(self, fullname: str) -> None:
        self.fullname = fullname

    def create_module(self, spec: Any) -> types.ModuleType:
        return _create_stub_module()

    def exec_module(self, module: types.ModuleType) -> None:
        pass


class _ChromaEmbeddingStubMetaFinder:
    """Meta path finder to intercept chromadb.utils.embedding_functions."""

    STUB_MODULE_NAME = "chromadb.utils.embedding_functions"

    def find_spec(
        self,
        fullname: str,
        path: Any = None,
        target: Any = None,
    ) -> Any:
        if fullname != self.STUB_MODULE_NAME:
            return None
        from importlib.machinery import ModuleSpec

        return ModuleSpec(
            fullname,
            _ChromaEmbeddingStubLoader(fullname),
            origin="chromadb_embedding_stub",
            is_package=False,
        )


def install_stub() -> None:
    """Install the import hook so chromadb gets our stub instead of loading onnx."""
    if _ChromaEmbeddingStubMetaFinder.STUB_MODULE_NAME not in sys.modules:
        sys.meta_path.insert(0, _ChromaEmbeddingStubMetaFinder())
