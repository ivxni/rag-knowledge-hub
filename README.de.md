# Knowledge Hub — RAG-basierte Wissensdatenbank

> **[English Version (README.md)](./README.md)**

Ein Full-Stack Retrieval-Augmented Generation (RAG) System, gebaut mit Next.js und Supabase. Nutzer können Dokumente hochladen, Fragen stellen und KI-generierte Antworten erhalten, die auf ihrer eigenen Wissensbasis basieren — mit Quellenangaben.

## Entwicklungsmethodik

### Problemanalyse

Die Aufgabe ist es, ein End-to-End RAG-Feature zu entwickeln, das folgendes demonstriert:
- **Dokumenten-Ingestion** (Chunking, Embedding, Vektorspeicherung)
- **Semantische Suche** (Vektor-Ähnlichkeitssuche)
- **Kontextgebundene Generierung** (LLM-Antworten beschränkt auf abgerufenen Kontext)
- **Full-Stack-Integration** (API-Design, Auth, Persistenz, UI)

Die zentrale Anforderung: Antworten müssen auf Quelldokumente zurückführbar sein, nicht aus dem Trainingswissen des LLM halluziniert.

### Architektur

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                 │
│  Startseite → Auth → Dashboard → Workspace           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Login/   │  │  Workspace-  │  │  Chat + Quel- │  │
│  │  Register │  │  Auswahl     │  │  lenangaben   │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│                API-Schicht (Route Handlers)           │
│  /api/chat  /api/documents/ingest  /api/workspaces   │
├─────────────────────────────────────────────────────┤
│                    RAG-Pipeline                       │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐          │
│  │ Chunker │→ │ Embeddings│→ │ pgvector  │          │
│  └─────────┘  └───────────┘  └─────┬─────┘          │
│                                     ↓                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │ Generator │← │  Retriever│← │ Query Emb │        │
│  └───────────┘  └───────────┘  └───────────┘        │
├─────────────────────────────────────────────────────┤
│                    LLM-Provider                       │
│  Claude Sonnet 4 (Generierung)  HuggingFace API (Emb) │
├─────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + pgvector)         │
│  Auth │ Workspaces │ Dokumente │ Chunks │ Nachrichten │
│  Row-Level Security auf allen Tabellen                │
└─────────────────────────────────────────────────────┘
```

### Tech-Stack

| Schicht | Technologie | Begründung |
|---------|------------|-------------|
| Framework | Next.js 16 (App Router) | Server Components, Route Handlers, integrierte Auth-Patterns |
| Sprache | TypeScript (strict) | Typsicherheit über den gesamten Stack |
| Styling | Tailwind CSS + shadcn/ui | Schnelle, konsistente UI mit barrierefreien Komponenten |
| Datenbank | Supabase (PostgreSQL + pgvector) | Vorgegebener Stack, native Vektor-Unterstützung |
| Auth | Supabase Auth | Integriert mit RLS, konfigurationsfreies Session-Management |
| Generierung | Claude Sonnet 4 (Anthropic) | Starke Instruktionsbefolgung, strukturierte Ausgaben, konfigurierbar via Env-Variable |
| Embeddings | HuggingFace Inference API (all-MiniLM-L6-v2) | Bewährtes Modell via HTTP, kein API-Key nötig (Free Tier), 384 Dimensionen |
| Tests | Vitest | Schnell, ESM-nativ, exzellentes Mocking |

### RAG-Pipeline-Design

**Ingestion-Ablauf:**
1. Nutzer lädt Dokumenttext hoch (oder klickt "Seed Demo Data" für vorgefertigte Wissensbasis)
2. **Chunker** (`lib/rag/chunker.ts`): Rekursiver Zeichensplitter bei ca. 500 Token pro Chunk mit 50 Token Überlappung. Trennt an natürlichen Grenzen (Absätze → Sätze → Wörter) um semantische Kohärenz zu bewahren.
3. **Embeddings** (`lib/llm/local-embeddings.ts`): Ruft das `sentence-transformers/all-MiniLM-L6-v2` Modell über die HuggingFace Inference API auf. 384-dimensionale Vektoren, in 16er-Batches für Durchsatz. Free Tier — kein API-Key erforderlich.
4. **Speicherung**: Chunks + Embeddings in der `document_chunks`-Tabelle mit HNSW-Index für schnelle Abfragen.

**Abfrage-Ablauf:**
1. Nutzer stellt eine Frage
2. Frage wird mit demselben Modell (all-MiniLM-L6-v2) über die HuggingFace API eingebettet
3. **Retriever** (`lib/rag/retriever.ts`): pgvector Kosinus-Ähnlichkeitssuche. Top-5 Chunks über 0.3 Ähnlichkeitsschwelle. Nutzt eine dedizierte SQL-Funktion mit `security definer` für Titel-Attribution.
4. **Generator** (`lib/rag/generator.ts`): Erstellt einen strukturierten System-Prompt mit nummerierten Quellblöcken. **Claude Sonnet 4** (`claude-sonnet-4-20250514`) generiert eine Antwort, die auf den bereitgestellten Kontext beschränkt ist, mit `[Source N]` Zitaten. Das Modell ist konfigurierbar via `ANTHROPIC_MODEL` Env-Variable.

**Begründung der Chunking-Strategie:**
- 500 Tokens balancieren Kontextvollständigkeit mit Retrieval-Präzision
- 50 Token Überlappung verhindert Informationsverlust an Chunk-Grenzen
- Rekursives Splitting bewahrt Absatz-/Satzstruktur gegenüber willkürlichen Schnitten

**Begründung der Embedding-Strategie:**
- `all-MiniLM-L6-v2` ist ein bewährtes Modell für semantische Suche (MTEB-Benchmark)
- HuggingFace Inference API bietet zuverlässiges, konfigurationsfreies Hosting — Free Tier reicht für Demo
- 384 Dimensionen sind ausreichend für RAG-Retrieval bei reduziertem Speicherbedarf

### Prompt Engineering

Der System-Prompt für den Generator folgt diesen Prinzipien:
- **Rollendefinition**: Explizite Identität als Wissensbasis-Assistent
- **Kontextbindung**: "Antworte NUR anhand der bereitgestellten Quellen" verhindert Halluzination
- **Zitationsformat**: "[Source N]" Referenzen für Nachvollziehbarkeit
- **Fallback-Verhalten**: Explizite Anweisung, es zu sagen wenn Quellen nicht ausreichen
- **Sprachanpassung**: Antwortet in der Sprache des Nutzers

### Design-Entscheidungen & Trade-offs

**Provider-Abstraktion:**
Separate Interfaces für `GenerationProvider` und `EmbeddingProvider`, da nicht alle LLMs beide Fähigkeiten bieten (Claude hat keine Embedding-API). Factory Pattern mit Singleton-Instanzen vermeidet wiederholte Initialisierung.

**HuggingFace Inference API für Embeddings:**
Nutzt dasselbe `all-MiniLM-L6-v2` Modell via HTTP statt lokaler ONNX-Inferenz. Das sichert zuverlässiges Deployment auf allen Plattformen (Vercel Serverless, lokale Entwicklung). Der Free Tier reicht für Demo-Nutzung. Trade-off: Netzwerk-Latenz pro Embedding-Aufruf, aber Batching (16 Texte/Request) hält den Durchsatz hoch.

**Nicht-streaming initialer Ansatz:**
Der Chat nutzt synchrones Request/Response statt Streaming für den MVP. Dies vereinfacht Fehlerbehandlung und Quellenattribution (Quellen werden zusammen mit der Antwort zurückgegeben). Streaming kann durch Umschalten auf die vorhandene `streamAnswer()`-Funktion hinzugefügt werden.

**Service-Client für Embeddings:**
Vektor-Einfügungen nutzen den Supabase Service-Role-Client (umgeht RLS), da pgvector-Spalten spezielle Behandlung erfordern. Alle anderen Operationen nutzen den nutzerbezogenen Client mit RLS.

**Multi-Tenant via Workspaces:**
Jeder Workspace isoliert Dokumente, Chunks und Konversationen. RLS-Policies stellen sicher, dass Nutzer nur eigene Daten sehen. Die `workspace_id`-Spalte auf `document_chunks` ermöglicht effiziente gefilterte Vektorsuche.

**HNSW vs IVFFlat Index:**
HNSW wurde gegenüber IVFFlat für den Vektor-Index gewählt, da es besseren Recall bei kleinen Datensets bietet, ohne Training zu erfordern — ideal für einen Demo-/Evaluierungskontext.

## Projektstruktur

```
src/
  app/
    page.tsx                              # Startseite
    (auth)/
      login/page.tsx                      # Login-Formular
      register/page.tsx                   # Registrierungsformular
      actions.ts                          # Server Actions (Login, Register, Logout)
    (dashboard)/
      layout.tsx                          # Sidebar + Header Layout
      dashboard/page.tsx                  # Workspace-Verwaltung
      workspace/[id]/
        layout.tsx                        # Chat/Dokumente Tab-Navigation
        page.tsx                          # Chat-Interface
        documents/page.tsx                # Dokumentverwaltung + Viewer
    api/
      chat/route.ts                       # RAG-Abfrage-Endpunkt
      documents/route.ts                  # Dokument-CRUD
      documents/ingest/route.ts           # Chunking + Embedding Pipeline
      workspaces/route.ts                 # Workspace-CRUD + DELETE
      conversations/route.ts              # Konversations-CRUD
      conversations/[id]/messages/route.ts
      seed/route.ts                       # Demo-Wissensbasis-Seeding
  components/
    chat/                                 # Chat-UI-Komponenten
    layout/                               # Sidebar, Header
    ui/                                   # shadcn/ui Primitives
  lib/
    supabase/                             # Client-Initialisierung
    llm/                                  # Provider-Abstraktion
      types.ts                            # GenerationProvider / EmbeddingProvider Interfaces
      anthropic.ts                        # Claude Generierungs-Adapter
      local-embeddings.ts                 # HuggingFace Inference API Embedding-Adapter
    rag/                                  # Kern-RAG-Pipeline
      chunker.ts                          # Rekursiver Textsplitter
      embeddings.ts                       # Batch Embedding-Generierung
      retriever.ts                        # Vektor-Ähnlichkeitssuche
      generator.ts                        # Prompt-Konstruktion + LLM-Aufruf
    seed/                                 # Demo-Seed-Daten + Ingestion-Script
  types/index.ts                          # Gemeinsame TypeScript-Interfaces
  middleware.ts                           # Auth-Routenschutz
  __tests__/rag/                          # Unit-Tests
supabase/
  migration.sql                           # Datenbankschema + RLS + Funktionen
  migrate-384.sql                         # Migration für lokale Embedding-Dimensionen
```

## Setup & Ausführung

### Voraussetzungen
- Node.js 18+
- Supabase-Projekt (Free Tier reicht aus)
- Anthropic API-Key (Claude)

> **Hinweis:** Embeddings nutzen die kostenlose HuggingFace Inference API — kein API-Key erforderlich. Optional `HUGGINGFACE_TOKEN` setzen für höhere Rate Limits.

### 1. Klonen & Installieren

```bash
git clone <repo-url>
cd rag-knowledge-hub
npm install
```

### 2. Supabase einrichten

1. Neues Projekt erstellen auf [supabase.com](https://supabase.com)
2. Im **SQL Editor** den Inhalt von `supabase/migration.sql` ausführen
3. Unter **Authentication → Settings** die Option "Confirm email" bei Email Auth deaktivieren
4. Projekt-URL und Keys unter **Settings → API** kopieren

### 3. Umgebungsvariablen

`.env.example` nach `.env.local` kopieren und ausfüllen:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

### 5. Wissensbasis seeden

Nach Registrierung und Login auf **"Seed Demo Data"** im Dashboard klicken. Dies erstellt einen "AI Engineering Handbook" Workspace mit 7 vorgefertigten Dokumenten zu KI/ML-Engineering-Themen. Die Dokumente werden automatisch in Chunks aufgeteilt und eingebettet.

Der erste Seed kann ca. 30 Sekunden dauern, da jedes Dokument in Chunks aufgeteilt und über die HuggingFace API eingebettet wird.

### 6. Tests ausführen

```bash
npm test
```

## Mögliche Erweiterungen

- **Streaming-Antworten**: Umschalten von `generateAnswer` auf `streamAnswer` für Echtzeit-Token-Ausgabe
- **Datei-Upload**: PDF/DOCX serverseitig parsen vor dem Chunking
- **Hybride Suche**: Vektor-Ähnlichkeit mit Volltextsuche (BM25) kombinieren für besseren Recall
- **Re-Ranking**: Cross-Encoder Re-Ranking-Schritt nach initialem Retrieval
- **Konversationskontext**: Vorherige Nachrichten im Generator-Prompt für Folgefragen einbeziehen
- **Admin-Dashboard**: Nutzungsanalytik, Dokumentverwaltung über Workspaces
- **Rate Limiting**: Token-basiertes Rate Limiting auf der Chat-API
- **n8n Workflow-Automatisierung**: Dokumenten-Ingestion über n8n-Workflows automatisieren — z.B. einen Google Drive Ordner, eine Notion-Datenbank oder Confluence-Space überwachen und den `/api/documents/ingest` Endpunkt bei Änderungen triggern, um die Wissensbasis stets aktuell zu halten
- **Deployment**: Vercel + Supabase gehostetes Projekt für Live-Demo
