import httpx
from app.core.config import settings


class LLMProvider:
    """LLM completion adapter with prompt policy grounding (Section 8.2 & 12.2)."""

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL

    def generate_grounded_answer(
        self,
        question: str,
        context_chunks: list[dict]
    ) -> tuple[str, int, int]:
        """
        Generate answer based strictly on retrieved source context.
        Returns (answer_text, prompt_tokens, completion_tokens).
        """
        # Format context with explicit untrusted boundaries (Section 8.2 step 7)
        context_text = ""
        for idx, chunk in enumerate(context_chunks):
            doc_title = chunk.get("doc_title", "Document")
            page = chunk.get("page_number", 1)
            content = chunk.get("content", "")
            context_text += f"\n--- [Source {idx+1}: {doc_title}, Page {page}] ---\n{content}\n"

        system_policy = (
            "You are Bytherix Enterprise AI Assistant. You must answer questions using ONLY "
            "the provided context sources below. If the context does not contain sufficient evidence "
            "to answer, clearly state: 'I do not have sufficient information in the provided documents to answer this.' "
            "Always cite your sources using [Source X: Document Name, Page Y]."
        )

        user_prompt = f"Context Information:\n{context_text}\n\nQuestion: {question}\n\nAnswer:"

        # 1. If OpenAI API key is set, call OpenAI
        if self.api_key and not self.api_key.startswith("your-"):
            try:
                with httpx.Client(timeout=45.0) as client:
                    resp = client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": system_policy},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": 0.1
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        answer = data["choices"][0]["message"]["content"]
                        usage = data.get("usage", {})
                        return answer, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
            except Exception:
                pass

        # 2. Offline Fallback Extractor (Section 8.2 step 12)
        if not context_chunks:
            return "I do not have sufficient information in the provided documents to answer this question.", 50, 20

        # Build grounded summary from highest scoring chunk
        best_chunk = context_chunks[0]
        title = best_chunk.get("doc_title", "Document")
        page = best_chunk.get("page_number", 1)
        snippet = best_chunk.get("content", "").strip()[:400]
        
        answer = f"Based on {title} (Page {page}):\n\n{snippet}...\n\n[Source: {title}, Page {page}]"
        return answer, len(user_prompt.split()), len(answer.split())


llm_provider = LLMProvider()
