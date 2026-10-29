import hashlib
import math
from typing import List
import httpx
from app.core.config import settings


class EmbeddingProvider:
    """Embedding model adapter (Section 4.2 & 8.1)."""

    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.api_key = settings.LLM_API_KEY
        self.model = settings.EMBEDDING_MODEL

    def get_embedding(self, text: str) -> List[float]:
        """Generate a normalized 1536-dimensional vector for text."""
        # 1. If real OpenAI API key is set, call OpenAI
        if self.api_key and not self.api_key.startswith("your-"):
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={"input": text, "model": self.model}
                    )
                    if resp.status_code == 200:
                        return resp.json()["data"][0]["embedding"]
            except Exception:
                pass

        # 2. Offline Deterministic Embedding Generator (for offline testing & development)
        # Uses word-frequency n-gram projection with L2 normalization
        vector = [0.0] * self.dimension
        words = text.lower().split()
        if not words:
            return vector

        for word in words:
            # Deterministic bucket hash
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h >> 16) % 2 == 0 else -1.0
            vector[idx] += sign

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]
        return vector


embedding_provider = EmbeddingProvider()
