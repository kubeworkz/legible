import logging
import os
from typing import Any, Optional

from haystack import Document
from haystack.utils import Secret
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore
from haystack_integrations.document_stores.qdrant.converters import (
    convert_qdrant_point_to_haystack_document,
)
from haystack_integrations.document_stores.qdrant.filters import (
    convert_filters_to_qdrant,
)
from qdrant_client.http import models as rest

from src.core.provider import DocumentStoreProvider
from src.providers.loader import provider

logger = logging.getLogger("wren-ai-service")


class AsyncQdrantDocumentStore(QdrantDocumentStore):
    """Thin wrapper that adds project_id payload index and empty-embedding fallback."""

    def create_payload_index(self):
        """Create payload index for project_id partitioning.

        Call after construction. Improves indexing performance with per-project partitioning.
        See https://qdrant.tech/documentation/guides/multiple-partitions/?q=mul#calibrate-performance
        """
        self._initialize_client()
        self._client.create_payload_index(
            collection_name=self.index, field_name="project_id", field_schema="keyword"
        )

    async def _query_by_filters(
        self,
        filters: dict[str, Any] | None = None,
        top_k: int | None = None,
    ) -> list[Document]:
        """Scroll-based retrieval by filters only (no embedding)."""
        qdrant_filters = convert_filters_to_qdrant(filters)
        await self._initialize_async_client()
        assert self._async_client is not None
        points_list = []
        offset = None
        while True:
            points, next_offset = await self._async_client.scroll(
                collection_name=self.index,
                offset=offset,
                scroll_filter=qdrant_filters,
                limit=top_k,
            )
            points_list.extend(points)
            if next_offset is None:
                break
            offset = next_offset

        return [
            convert_qdrant_point_to_haystack_document(
                point, use_sparse_embeddings=self.use_sparse_embeddings
            )
            for point in points_list
        ]

    async def _query_by_embedding_async(self, query_embedding, **kwargs):
        """Override to handle empty embeddings via filter-based scrolling."""
        if query_embedding:
            return await super()._query_by_embedding_async(
                query_embedding=query_embedding, **kwargs
            )
        return await self._query_by_filters(
            filters=kwargs.get("filters"),
            top_k=kwargs.get("top_k"),
        )

    def _query_by_embedding(self, query_embedding, **kwargs):
        """Sync override to handle empty embeddings via filter-based scrolling."""
        if query_embedding:
            return super()._query_by_embedding(
                query_embedding=query_embedding, **kwargs
            )
        return self._query_by_filters_sync(
            filters=kwargs.get("filters"),
            top_k=kwargs.get("top_k"),
        )

    def _query_by_filters_sync(
        self,
        filters: dict[str, Any] | None = None,
        top_k: int | None = None,
    ) -> list[Document]:
        """Sync scroll-based retrieval by filters only."""
        qdrant_filters = convert_filters_to_qdrant(filters)
        self._initialize_client()
        points_list = []
        offset = None
        while True:
            points, next_offset = self._client.scroll(
                collection_name=self.index,
                offset=offset,
                scroll_filter=qdrant_filters,
                limit=top_k,
            )
            points_list.extend(points)
            if next_offset is None:
                break
            offset = next_offset

        return [
            convert_qdrant_point_to_haystack_document(
                point, use_sparse_embeddings=self.use_sparse_embeddings
            )
            for point in points_list
        ]


class AsyncQdrantEmbeddingRetriever(QdrantEmbeddingRetriever):
    """Subclass for type identity — all custom logic is in AsyncQdrantDocumentStore."""

    pass


@provider("qdrant")
class QdrantProvider(DocumentStoreProvider):
    def __init__(
        self,
        location: str = os.getenv("QDRANT_HOST", "qdrant"),
        api_key: Optional[str] = os.getenv("QDRANT_API_KEY", None),
        timeout: Optional[int] = (
            int(os.getenv("QDRANT_TIMEOUT")) if os.getenv("QDRANT_TIMEOUT") else 120
        ),
        embedding_model_dim: int = (
            int(os.getenv("EMBEDDING_MODEL_DIMENSION"))
            if os.getenv("EMBEDDING_MODEL_DIMENSION")
            else 0
        ),
        recreate_index: bool = (
            bool(os.getenv("SHOULD_FORCE_DEPLOY"))
            if os.getenv("SHOULD_FORCE_DEPLOY")
            else False
        ),
        **_,
    ):
        self._location = location
        self._api_key = Secret.from_token(api_key) if api_key else None
        self._timeout = timeout
        self._embedding_model_dim = embedding_model_dim
        self._reset_document_store(recreate_index)

    def _reset_document_store(self, recreate_index: bool):
        self.get_store(recreate_index=recreate_index)
        self.get_store(dataset_name="table_descriptions", recreate_index=recreate_index)
        self.get_store(dataset_name="view_questions", recreate_index=recreate_index)
        self.get_store(dataset_name="sql_pairs", recreate_index=recreate_index)
        self.get_store(dataset_name="instructions", recreate_index=recreate_index)
        self.get_store(dataset_name="project_meta", recreate_index=recreate_index)

    def get_store(
        self,
        dataset_name: Optional[str] = None,
        recreate_index: bool = False,
    ):
        store = AsyncQdrantDocumentStore(
            location=self._location,
            api_key=self._api_key,
            embedding_dim=self._embedding_model_dim,
            index=dataset_name or "Document",
            recreate_index=recreate_index,
            on_disk=True,
            timeout=self._timeout,
            quantization_config=(
                rest.BinaryQuantization(
                    binary=rest.BinaryQuantizationConfig(
                        always_ram=True,
                    )
                )
                if self._embedding_model_dim >= 1024
                else None
            ),
            # to improve the indexing performance, we disable building global index for the whole collection
            # see https://qdrant.tech/documentation/guides/multiple-partitions/?q=mul#calibrate-performance
            hnsw_config=rest.HnswConfigDiff(
                payload_m=16,
                m=0,
            ),
        )
        store.create_payload_index()
        return store

    def get_retriever(
        self,
        document_store: AsyncQdrantDocumentStore,
        top_k: int = 10,
    ):
        return AsyncQdrantEmbeddingRetriever(
            document_store=document_store,
            top_k=top_k,
        )
