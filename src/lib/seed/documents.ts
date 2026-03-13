export const seedDocuments = [
  {
    title: "Prompt Engineering Best Practices",
    content: `# Prompt Engineering Best Practices

## System Prompts

System prompts define the AI's role, behavior, and constraints. They are processed before user messages and establish the model's "personality" and guardrails. Best practices include:

- **Be explicit about the role**: "You are a senior software architect specializing in distributed systems."
- **Specify output format**: Request JSON, markdown, or structured responses upfront.
- **Set boundaries**: Define what the model should refuse (e.g., medical advice, legal opinions).
- **Use delimiters**: Wrap instructions in XML tags or triple backticks to prevent injection.

System prompts work best when concise yet comprehensive. Avoid contradictory instructions and prioritize clarity over length.

## Few-Shot Learning

Few-shot learning provides 2-5 example input-output pairs before the actual query. This dramatically improves consistency for structured tasks:

\`\`\`
Example 1:
Input: "Translate to French: Hello"
Output: "Bonjour"

Example 2:
Input: "Translate to French: Goodbye"
Output: "Au revoir"

Now translate: "Thank you"
\`\`\`

Use diverse, representative examples. For classification, include edge cases. For generation, show the desired tone and length. Few-shot works best when examples are similar in structure to the target task.

## Chain-of-Thought (CoT)

Chain-of-thought prompting asks the model to "think step by step" or "show your reasoning." This improves accuracy on arithmetic, logic, and multi-step reasoning tasks by externalizing the reasoning process.

- **Zero-shot CoT**: Add "Let's think step by step" at the end of the prompt.
- **Few-shot CoT**: Provide examples with explicit reasoning chains.
- **Self-consistency**: Generate multiple reasoning paths and take the majority answer.

CoT increases token usage but often yields significant accuracy gains on complex problems.

## Temperature Settings

Temperature controls randomness in generation (0.0 to 2.0 typically):

- **0.0–0.3**: Deterministic, factual, consistent. Use for extraction, classification, code.
- **0.4–0.7**: Balanced creativity. Use for drafting, brainstorming, varied responses.
- **0.8–2.0**: High creativity, less predictable. Use for creative writing, ideation.

For RAG and retrieval-augmented tasks, lower temperatures (0.0–0.2) reduce hallucination. For creative tasks, 0.7–0.9 is common.

## Structured Output

Request structured output to integrate with downstream systems:

- **JSON mode**: Many APIs support \`response_format: { type: "json_object" }\`.
- **Schema enforcement**: Use JSON Schema to validate and constrain output shape.
- **XML or markdown**: Parse with standard libraries for semi-structured data.

Always validate outputs; models can produce invalid JSON under edge cases.

## Common Pitfalls

- **Vague instructions**: "Be helpful" is too broad. Specify what "helpful" means.
- **Overloading context**: Long prompts dilute important instructions. Prioritize and trim.
- **Assuming model knowledge**: Don't assume the model knows your domain; provide context.
- **Ignoring token limits**: Long inputs truncate; summarize or chunk strategically.
- **Prompt injection**: Sanitize user input; avoid passing untrusted content directly into system prompts.`,
  },
  {
    title: "RAG Architecture Patterns",
    content: `# RAG Architecture Patterns

## Naive RAG

Naive RAG is the simplest retrieval-augmented generation pipeline:

1. **Indexing**: Chunk documents, embed chunks, store in a vector database.
2. **Retrieval**: Embed the user query, retrieve top-k similar chunks.
3. **Generation**: Concatenate chunks with the query, send to the LLM.

This works well for small, homogeneous corpora. Limitations include: no query understanding, fixed chunk size, single retrieval pass, and no re-ranking. Use naive RAG for prototypes and simple Q&A over static docs.

## Advanced RAG: Query Rewriting

Query rewriting improves retrieval by transforming the user query before embedding:

- **Query expansion**: Add synonyms or related terms.
- **Hypothetical Document Embeddings (HyDE)**: Generate a hypothetical answer, embed it, and retrieve similar chunks.
- **Multi-query**: Generate multiple query variants, retrieve for each, merge and deduplicate results.

Query rewriting increases latency but often improves recall, especially for ambiguous or short queries.

## Advanced RAG: Re-Ranking

Re-ranking applies a second-stage model to refine retrieval results:

- **Cross-encoder models**: Score query-document pairs for relevance (e.g., Cohere Rerank, cross-encoder from sentence-transformers).
- **LLM-based re-ranking**: Use the LLM to score or filter chunks.
- **Diversity re-ranking**: Ensure retrieved chunks cover different aspects (MMR, Maximal Marginal Relevance).

Re-ranking typically improves precision; retrieve 20–50 chunks, re-rank to top 5–10.

## Advanced RAG: Hybrid Search

Hybrid search combines dense (vector) and sparse (keyword) retrieval:

- **Dense**: Semantic similarity via embeddings.
- **Sparse**: BM25, TF-IDF, or keyword matching.
- **Fusion**: Reciprocal Rank Fusion (RRF) or weighted combination of scores.

Hybrid search handles both semantic and exact-match queries (e.g., product IDs, code snippets).

## Evaluation Metrics

- **Retrieval**: Recall@k, MRR (Mean Reciprocal Rank), NDCG.
- **Generation**: Faithfulness (does the answer align with retrieved context?), Answer Relevancy (does it address the query?), Context Precision.
- **End-to-end**: Human evaluation, task-specific metrics (e.g., correct citations).

Use retrieval metrics to tune chunking and retrieval; use generation metrics to tune prompts and re-ranking.

## Chunking Strategies Overview

- **Fixed-size**: Simple, predictable; may split sentences or concepts.
- **Sentence-aware**: Chunk on sentence boundaries; preserves coherence.
- **Semantic chunking**: Split on topic shifts using embeddings or NLP.
- **Recursive character split**: Split on \`\\n\\n\`, then \`\\n\`, then spaces; preserves hierarchy.
- **Overlap**: Add overlap between chunks to preserve context at boundaries.

Chunk size trades off context (larger) vs. precision (smaller). Typical range: 256–1024 tokens.`,
  },
  {
    title: "Embedding Models and Vector Databases",
    content: `# Embedding Models and Vector Databases

## How Embeddings Work

Embeddings map text (or other data) to dense vectors in a high-dimensional space (typically 384–1536 dimensions). Semantically similar texts cluster together; dissimilar texts are far apart. The embedding model is trained so that similarity in vector space reflects semantic similarity.

Key properties:
- **Dimensionality**: Higher dimensions can capture more nuance but increase storage and compute.
- **Normalization**: Many models produce unit vectors; cosine similarity equals dot product.
- **Domain alignment**: Models trained on your domain often outperform general-purpose models.

## Popular Embedding Models

**OpenAI text-embedding-3-small / text-embedding-3-large**: High quality, API-based. Supports dimension reduction. Good for general-purpose RAG.

**Cohere embed-v3**: Multilingual, supports input type (search_document vs search_query). Strong for retrieval tasks.

**sentence-transformers (Hugging Face)**: Open-source, run locally. Examples: all-MiniLM-L6-v2 (fast, 384d), all-mpnet-base-v2 (higher quality), multilingual-e5-large. No API cost; full control over deployment.

**Voyage AI, Jina AI**: Specialized models for long-context or domain-specific use cases.

## Vector Database Options

**pgvector (PostgreSQL extension)**: Adds vector type and similarity operators. Use when you already have PostgreSQL; supports HNSW and IVFFlat indexes. Good for small-to-medium scale.

**Pinecone**: Managed, serverless. Auto-scaling, low ops. Strong for production RAG with high throughput.

**Weaviate**: Open-source or managed. Supports hybrid search, built-in vectorization, GraphQL API. Flexible schema.

**Chroma, Qdrant, Milvus**: Other popular options. Chroma is lightweight for prototyping; Qdrant and Milvus scale to large datasets.

**Supabase, Neon**: Offer pgvector as part of managed Postgres for simpler setups.

## Similarity Metrics

- **Cosine similarity**: Measures angle between vectors. Range [-1, 1]. Invariant to magnitude; standard for normalized embeddings.
- **Dot product**: Equivalent to cosine when vectors are normalized. Used by many vector DBs for efficiency.
- **Euclidean distance (L2)**: Straight-line distance. Requires normalized vectors for fair comparison with cosine.
- **Inner product**: Some systems use raw dot product; check model documentation.

For most embedding models, cosine similarity or dot product on normalized vectors is the default choice.`,
  },
  {
    title: "LLM Evaluation and Testing",
    content: `# LLM Evaluation and Testing

## Automatic Metrics: BLEU and ROUGE

**BLEU (Bilingual Evaluation Understudy)**: Measures n-gram overlap between generated and reference text. Originally for machine translation. Penalizes length; can be brittle for paraphrased or semantically equivalent outputs.

**ROUGE (Recall-Oriented Understudy for Gisting Evaluation)**: ROUGE-N (n-gram), ROUGE-L (longest common subsequence). Common in summarization. Focuses on recall of reference content.

Both metrics are cheap and automatable but correlate imperfectly with human judgment. Use as signals, not sole criteria.

## Human Evaluation

Human evaluation remains the gold standard for subjective quality:

- **Relevance**: Does the output address the query?
- **Coherence**: Is it logically structured and fluent?
- **Factuality**: Are claims supported by sources?
- **Helpfulness**: Would a user find this useful?

Use rubrics and calibration to reduce rater variance. Sample strategically; evaluate 100–500 examples for meaningful signals.

## Hallucination Detection

Hallucinations are confident but incorrect or unsupported claims. Detection approaches:

- **NLI-based**: Use natural language inference models to check if the claim entails the retrieved context.
- **Self-consistency**: Compare multiple generations; inconsistent answers may indicate hallucination.
- **Citation checking**: Verify that cited sources support the stated claims.
- **Fact-checking models**: Dedicated models (e.g., for medical, legal) to validate factual claims.

For RAG, ensure answers are grounded in retrieved context; measure faithfulness and citation accuracy.

## A/B Testing

A/B test prompts, models, or retrieval strategies:

- **Random assignment**: Split traffic between variants.
- **Metrics**: Task success, latency, user satisfaction, cost per query.
- **Statistical significance**: Use appropriate tests (e.g., t-test, bootstrap) and sufficient sample size.
- **Guard against regressions**: Monitor both primary and secondary metrics.

## Regression Testing for Prompts

Treat prompts as code; version and test them:

- **Golden dataset**: Curated input-output pairs representing expected behavior.
- **Automated runs**: Re-run prompts on golden set when prompts change.
- **Diff outputs**: Compare new outputs to baselines; flag regressions.
- **Semantic similarity**: For flexible outputs, use embedding similarity instead of exact match.

Integrate prompt tests into CI/CD; block deployments that regress on critical cases.`,
  },
  {
    title: "Fine-Tuning vs RAG: When to Use What",
    content: `# Fine-Tuning vs RAG: When to Use What

## Decision Framework

| Factor | Prefer RAG | Prefer Fine-Tuning |
|--------|------------|-------------------|
| Data volume | Small to large, unstructured | Moderate to large, labeled |
| Update frequency | High (docs change often) | Low (stable task) |
| Task type | Knowledge retrieval, Q&A | Style, format, domain jargon |
| Latency budget | Higher (retrieval + generation) | Lower (single forward pass) |
| Cost model | Pay per query, retrieval cost | Upfront training, lower per-query |

Use RAG when the primary need is accessing external or changing knowledge. Use fine-tuning when the model must internalize patterns, style, or domain-specific behavior that is hard to prompt.

## Cost Comparison

**RAG**: Indexing cost (one-time or incremental), embedding API cost, vector DB storage, retrieval compute, LLM API cost per query. Scales with query volume.

**Fine-tuning**: Data preparation, training compute (GPU hours), storage for model variants. Fixed upfront; inference cost similar to base model. May reduce prompt length and thus per-query cost.

For knowledge-heavy tasks with evolving content, RAG often wins on total cost. For high-volume, stable tasks with clear patterns, fine-tuning can be more economical long-term.

## Data Requirements

**RAG**: Documents, FAQs, or any retrievable content. No labels required for indexing; labels help for evaluation.

**Fine-tuning**: Labeled input-output pairs. Typically hundreds to tens of thousands. Quality matters more than quantity. Diverse, representative data reduces overfitting.

**Hybrid**: Fine-tune for style or format; use RAG for factual knowledge. Common in enterprise applications.

## Use Cases for Each

**RAG excels at**: Customer support over docs, internal knowledge bases, legal/medical Q&A with citations, product catalogs, documentation assistants. Any domain where answers must be grounded in specific, updatable sources.

**Fine-tuning excels at**: Custom tone (formal, casual, brand voice), structured output formats, domain terminology, task-specific classification, reducing prompt length for complex instructions.

**Combine both**: Fine-tune a model to follow instructions and cite sources; use RAG to supply the sources.`,
  },
  {
    title: "AI Agent Architectures",
    content: `# AI Agent Architectures

## ReAct Pattern

ReAct (Reasoning + Acting) interleaves reasoning and action:

1. **Thought**: Model reasons about what to do next.
2. **Action**: Model selects a tool and arguments.
3. **Observation**: Environment returns the tool result.
4. **Repeat** until the task is done or a final answer is produced.

This loop enables the agent to use external tools (search, calculators, APIs) and adapt its plan based on observations. ReAct reduces hallucination by grounding actions in real observations.

## Tool Use

Agents invoke tools to extend their capabilities:

- **Tool schema**: Name, description, parameters (JSON Schema). Clear descriptions improve tool selection.
- **Common tools**: Web search, code execution, database queries, API calls, file operations.
- **Safety**: Validate inputs, sandbox execution, rate-limit external calls.

Design tools to be atomic and idempotent where possible. Return structured data to simplify parsing.

## Planning

Planning decomposes complex tasks into steps:

- **Task decomposition**: Break a goal into subtasks (e.g., "Plan a trip" → book flight, hotel, activities).
- **Plan-and-execute**: Create a plan first, then execute; refine if observations contradict the plan.
- **Hierarchical**: Sub-agents handle subtasks; parent coordinates.

Planning improves reliability on multi-step tasks but adds latency. Use for tasks with clear dependencies.

## Multi-Agent Systems

Multiple agents collaborate on a shared goal:

- **Specialization**: Different agents for research, writing, critique, execution.
- **Orchestration**: Central coordinator assigns tasks and aggregates results.
- **Debate**: Agents argue or critique each other's outputs to improve quality.
- **Handoffs**: Agents pass context and partial results between each other.

Multi-agent systems increase complexity; use when a single agent cannot reliably complete the task.

## Memory Types

**Short-term (context window)**: Current conversation, recent tool results. Limited by model context length. Summarize or truncate when full.

**Long-term (external store)**: Vector DB, graph DB, or key-value store. Agent stores and retrieves relevant memories across sessions. Enables personalization and continuity.

**Episodic vs. semantic**: Episodic = specific events; semantic = general knowledge. Design retrieval to match the memory type.

**Memory management**: Decide what to store, when to retrieve, and when to forget. Avoid unbounded growth; prune or summarize old memories.`,
  },
  {
    title: "Production ML Systems",
    content: `# Production ML Systems

## Model Serving

Model serving delivers predictions at inference time:

- **APIs**: REST or gRPC endpoints. Include versioning, authentication, rate limiting.
- **Batching**: Group requests to improve GPU utilization; trade latency for throughput.
- **Caching**: Cache frequent or identical queries to reduce load.
- **Load balancing**: Distribute traffic across replicas; use health checks.

For LLMs, consider vLLM, TGI (Text Generation Inference), or managed APIs (OpenAI, Anthropic). For embeddings, use dedicated embedding endpoints or local models.

## Monitoring

Monitor both system and model health:

- **Latency**: p50, p95, p99. Track by endpoint and model.
- **Throughput**: Requests per second, tokens per second.
- **Error rates**: 4xx, 5xx, timeouts, model errors.
- **Quality**: Task-specific metrics (accuracy, relevance), user feedback, A/B results.

Set alerts on SLO violations. Use distributed tracing to debug slow requests.

## Drift Detection

Data and concept drift can degrade model performance:

- **Input drift**: Distribution of inputs changes (e.g., new query types, different languages).
- **Concept drift**: Relationship between inputs and outputs changes.
- **Detection methods**: Statistical tests (PSI, KS), monitoring feature distributions, tracking performance over time.

Retrain or fine-tune when drift is detected and performance degrades. Maintain a labeled evaluation set for regression checks.

## Scaling

- **Horizontal**: Add more replicas; use a load balancer. Scale based on CPU, GPU, or request queue depth.
- **Vertical**: Larger instances for single-model throughput. Often needed for large LLMs.
- **Autoscaling**: Scale replicas based on demand; scale to zero for cost savings when idle.
- **Multi-region**: Deploy in multiple regions for latency and redundancy.

## MLOps Practices

- **Versioning**: Model artifacts, code, data, and configs. Use MLflow, DVC, or similar.
- **Reproducibility**: Pin dependencies, record random seeds, document environments.
- **Experimentation**: Track experiments; compare runs before promoting to production.
- **Governance**: Access control, audit logs, compliance with data and model policies.

## CI/CD for ML

- **Build**: Build container images with model and serving code.
- **Test**: Unit tests for preprocessing, integration tests for APIs, model tests on golden data.
- **Deploy**: Blue-green or canary deployments. Roll back on quality or latency regressions.
- **Validation**: Run shadow mode (new model alongside old) before full cutover. Validate on production-like traffic.`,
  },
];
