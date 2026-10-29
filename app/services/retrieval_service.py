import io
import math
import re
from typing import List, Optional, Set
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.db.models.chunk import DocumentChunk
from app.db.models.document import Document
from app.integrations.embeddings.provider import embedding_provider
from app.integrations.llm.provider import llm_provider
from app.integrations.object_storage.s3 import storage_service
from app.schemas.chat import ChatResponse, SourceCitation


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into bounded chunks with overlap."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
        i += (chunk_size - overlap)
    return chunks if chunks else [text] if text.strip() else []


def parse_and_index_document(document_id: str, db: Session) -> Document:
    """
    Extract text, chunk, generate embeddings, and index into database (Section 8.1).
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    doc.status = "processing"
    db.commit()

    try:
        # 1. Download file from private object storage
        content_bytes = storage_service.download_file(doc.object_key)

        # 2. Extract text per page
        reader = PdfReader(io.BytesIO(content_bytes))
        page_count = len(reader.pages)
        doc.page_count = page_count

        total_chunks = 0
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                continue

            chunks = chunk_text(page_text, chunk_size=300, overlap=40)
            for chunk_idx, chunk_content in enumerate(chunks):
                # Generate embedding vector
                vector = embedding_provider.get_embedding(chunk_content)

                chunk_rec = DocumentChunk(
                    document_id=doc.id,
                    organization_id=doc.organization_id,
                    chunk_index=total_chunks,
                    page_number=page_idx + 1,
                    content=chunk_content,
                    token_count=len(chunk_content.split()),
                    embedding=vector
                )
                db.add(chunk_rec)
                total_chunks += 1

        doc.status = "ready"
        db.commit()
        db.refresh(doc)
        return doc

    except Exception as e:
        db.rollback()
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        raise e


STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "is", "are", "was", "were", "what", "which", "who", "whom", "this",
    "that", "these", "those", "how", "why", "when", "where", "can", "could",
    "will", "would", "do", "does", "did", "have", "has", "had", "of", "from",
    "about", "into", "over", "after"
}


def extract_terms(text: str) -> Set[str]:
    """Extract informative non-stopword tokens from query (Section 9.2)."""
    words = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower())
    return {w for w in words if w not in STOPWORDS}


def calculate_lexical_score(query_terms: Set[str], chunk_text: str, doc_title: str = "") -> float:
    """Calculate keyword overlap and title relevance score between 0.0 and 1.0."""
    if not query_terms:
        return 0.0
    text_lower = chunk_text.lower()
    title_lower = doc_title.lower()

    content_matches = sum(1 for term in query_terms if term in text_lower)
    title_matches = sum(1 for term in query_terms if term in title_lower)

    term_coverage = content_matches / len(query_terms)
    title_boost = min(0.3, (title_matches / len(query_terms)) * 0.3)

    return min(1.0, (term_coverage * 0.7) + title_boost)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def query_rag(
    organization_id: str,
    question: str,
    top_k: int,
    document_ids: Optional[List[str]],
    db: Session
) -> ChatResponse:
    """
    RAG Question-Answering Pipeline strictly constrained to tenant (Section 8.2).
    """
    # 1. Generate query embedding and extract keyword tokens
    query_vector = embedding_provider.get_embedding(question)
    query_terms = extract_terms(question)

    # 2. Fetch candidate chunks for this organization ONLY (Tenant Isolation!)
    query = db.query(DocumentChunk).filter(DocumentChunk.organization_id == organization_id)
    if document_ids:
        query = query.filter(DocumentChunk.document_id.in_(document_ids))
    
    chunks = query.all()
    if not chunks:
        return ChatResponse(
            answer="No documents found in your organization library to answer this question. Please upload a PDF first.",
            sources=[],
            model=embedding_provider.model,
            prompt_tokens=0,
            completion_tokens=0
        )

    # Cache document titles for scoring
    doc_cache = {}
    for c in chunks:
        if c.document_id not in doc_cache:
            d = db.query(Document).filter(Document.id == c.document_id).first()
            doc_cache[c.document_id] = d.title if d else "Document"

    # 3. Hybrid Scoring (Lexical Keyword Overlap + Semantic Vector Similarity)
    scored_chunks = []
    for c in chunks:
        doc_title = doc_cache.get(c.document_id, "")
        lex_score = calculate_lexical_score(query_terms, c.content, doc_title)
        
        emb = c.embedding
        vec_score = cosine_similarity(query_vector, list(emb)) if emb is not None else 0.0
        
        # Hybrid weighted combination (Section 9.2)
        final_score = (lex_score * 0.7) + (vec_score * 0.3) if query_terms else vec_score
        scored_chunks.append((final_score, c, doc_title))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_chunks = scored_chunks[:top_k]

    # 4. Build citations and context objects
    citations = []
    context_dicts = []
    for score, chunk, doc_title in top_chunks:
        citations.append(SourceCitation(
            document_id=chunk.document_id,
            document_title=doc_title,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            snippet=chunk.content[:200] + "...",
            similarity_score=round(float(score), 4)
        ))
        context_dicts.append({
            "doc_title": doc_title,
            "page_number": chunk.page_number,
            "content": chunk.content
        })

    # 5. Call LLM with grounded evidence
    answer, prompt_toks, comp_toks = llm_provider.generate_grounded_answer(
        question=question,
        context_chunks=context_dicts
    )

    return ChatResponse(
        answer=answer,
        sources=citations,
        model=llm_provider.model,
        prompt_tokens=prompt_toks,
        completion_tokens=comp_toks
    )
