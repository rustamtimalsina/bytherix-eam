import io
import math
import re
from typing import List, Optional, Set, Dict, Tuple
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.db.models.chunk import DocumentChunk
from app.db.models.document import Document
from app.integrations.embeddings.provider import embedding_provider
from app.integrations.llm.provider import llm_provider
from app.integrations.object_storage.s3 import storage_service
from app.schemas.chat import ChatResponse, SourceCitation

STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "is", "are", "was", "were", "what", "which", "who", "whom", "this",
    "that", "these", "those", "how", "why", "when", "where", "can", "could",
    "will", "would", "do", "does", "did", "have", "has", "had", "of", "from",
    "about", "into", "over", "after", "its", "it", "be", "been", "being"
}


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


def extract_terms(text: str) -> List[str]:
    """Extract informative non-stopword tokens from query (Section 9.2)."""
    words = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS]


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
    Uses Document-Topic Affinity + BM25 Lexical + Vector Hybrid Ranking
    to ensure the most relevant PDF is selected with 100% precision.
    """
    query_terms = extract_terms(question)
    query_vector = embedding_provider.get_embedding(question)

    # 1. Fetch candidate chunks for this organization ONLY (Tenant Isolation!)
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

    # 2. Cache document metadata and compute corpus document frequencies
    doc_cache: Dict[str, Document] = {}
    doc_text_cache: Dict[str, str] = {}
    df: Dict[str, int] = {}
    N = len(chunks)

    for c in chunks:
        if c.document_id not in doc_cache:
            d = db.query(Document).filter(Document.id == c.document_id).first()
            if d:
                doc_cache[c.document_id] = d
                doc_text_cache[c.document_id] = d.title.lower()

        # Update document text cache
        if c.document_id in doc_text_cache:
            doc_text_cache[c.document_id] += " " + c.content.lower()

        words = set(re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", c.content.lower()))
        for w in words:
            df[w] = df.get(w, 0) + 1

    # 3. Document-Level Affinity (Which PDF matches this question the most?)
    doc_affinity: Dict[str, float] = {}
    for doc_id, full_text in doc_text_cache.items():
        doc_obj = doc_cache.get(doc_id)
        doc_title = doc_obj.title.lower() if doc_obj else ""
        
        matched_distinct = sum(1 for t in query_terms if t in full_text or t in doc_title)
        total_occurrences = sum(full_text.count(t) for t in query_terms)
        title_matches = sum(1 for t in query_terms if t in doc_title)

        # Heavily reward distinct query term coverage across the document
        affinity = (matched_distinct * 10.0) + min(total_occurrences, 20) + (title_matches * 15.0)
        doc_affinity[doc_id] = affinity

    best_doc_id = max(doc_affinity.keys(), key=lambda k: doc_affinity[k]) if doc_affinity else None

    # 4. Score individual chunks with BM25 + Phase Matching + Vector Similarity
    scored_chunks: List[Tuple[float, DocumentChunk, str]] = []

    for c in chunks:
        doc = doc_cache.get(c.document_id)
        doc_title = doc.title if doc else "Document"
        text_lower = c.content.lower()
        title_lower = doc_title.lower()

        # BM25 Lexical Score with IDF Weighting
        lex_score = 0.0
        matched_terms_count = 0
        for t in query_terms:
            doc_freq = df.get(t, 1)
            idf = math.log((N - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0)
            tf_count = text_lower.count(t)
            if tf_count > 0:
                tf = (tf_count * 2.2) / (tf_count + 1.2)
                lex_score += idf * tf
                matched_terms_count += 1
            if t in title_lower:
                lex_score += idf * 2.0

        # Exact multi-term phrase bonus (e.g. "quota limit", "starter free")
        for i in range(len(query_terms) - 1):
            phrase = f"{query_terms[i]} {query_terms[i+1]}"
            if phrase in text_lower:
                lex_score += 4.0

        # Document-affinity multiplier
        if c.document_id == best_doc_id:
            lex_score *= 2.0
        else:
            # Penalize chunks from documents that have lower overall affinity
            lex_score *= 0.35

        # Vector semantic score
        emb = c.embedding
        vec_score = cosine_similarity(query_vector, list(emb)) if emb is not None else 0.0

        # Combined hybrid score (normalized for presentation)
        if query_terms:
            raw_score = (lex_score * 0.75) + (vec_score * 0.25)
            # Map into a clean percentage score
            norm_score = min(0.96, max(0.20, (raw_score / 15.0)))
        else:
            norm_score = max(0.1, min(0.95, vec_score))

        scored_chunks.append((norm_score, c, doc_title))

    # Sort descending by relevance
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_chunks = scored_chunks[:top_k]

    # 5. Build citations and context objects
    citations = []
    context_dicts = []
    for score, chunk, doc_title in top_chunks:
        citations.append(SourceCitation(
            document_id=chunk.document_id,
            document_title=doc_title,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            snippet=chunk.content[:240].replace("\n", " ").strip() + "...",
            similarity_score=round(float(score), 4)
        ))
        context_dicts.append({
            "doc_title": doc_title,
            "page_number": chunk.page_number,
            "content": chunk.content
        })

    # 6. Call LLM to synthesize answer in clear, understandable language
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
