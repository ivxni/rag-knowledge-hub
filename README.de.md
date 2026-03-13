# Knowledge Hub — RAG-basierte Wissensdatenbank

> **[English Version (README.md)](./README.md)**

Ein Full-Stack Retrieval-Augmented Generation (RAG) System, gebaut mit Next.js und Supabase. Nutzer koennen Dokumente hochladen, Fragen stellen und KI-generierte Antworten erhalten, die auf ihrer eigenen Wissensbasis basieren — mit Quellenangaben.

## Entwicklungsmethodik

### Problemanalyse

Die Aufgabe ist es, ein End-to-End RAG-Feature zu entwickeln, das folgendes demonstriert:
- **Dokumenten-Ingestion** (Chunking, Embedding, Vektorspeicherung)
- **Semantische Suche** (Vektor-Aehnlichkeitssuche)
- **Kontextgebundene Generierung** (LLM-Antworten beschraenkt auf abgerufenen Kontext)
- **Full-Stack-Integration** (API-Design, Auth, Persistenz, UI)

Die zentrale Anforderung: Antworten muessen auf Quelldokumente zurueckfuehrbar sein, nicht aus dem Trainingswissen des LLM halluziniert.

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
│  Claude Sonnet 4 (Generierung)  Transformers.js (Emb)│
├─────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + pgvector)         │
│  Auth │ Workspaces │ Dokumente │ Chunks │ Nachrichten │
│  Row-Level Security auf allen Tabellen                │
└─────────────────────────────────────────────────────┘
```

### Tech-Stack

| Schicht | Technologie | Begruendung |
|---------|------------|-------------|
| Framework | Next.js 16 (App Router) | Server Components, Route Handlers, integrierte Auth-Patterns |
| Sprache | TypeScript (strict) | Typsicherheit ueber den gesamten Stack |
| Styling | Tailwind CSS + shadcn/ui | Schnelle, konsistente UI mit barrierefreien Komponenten |
| Datenbank | Supabase (PostgreSQL + pgvector) | Vorgegebener Stack, native Vektor-Unterstuetzung |
| Auth | Supabase Auth | Integriert mit RLS, konfigurationsfreies Session-Management |
| Generierung | Claude Sonnet 4 (Anthropic) | Starke Instruktionsbefolgung, strukturierte Ausgaben, konfigurierbar via Env-Variable |
| Embeddings | Transformers.js (all-MiniLM-L6-v2) | Lokales ONNX-Modell, kein API-Key noetig, 384 Dimensionen |
| Tests | Vitest | Schnell, ESM-nativ, exzellentes Mocking |

### RAG-Pipeline-Design

**Ingestion-Ablauf:**
1. Nutzer laedt Dokumenttext hoch (oder klickt "Seed Demo Data" fuer vorgefertigte Wissensbasis)
2. **Chunker** (`lib/rag/chunker.ts`): Rekursiver Zeichensplitter bei ca. 500 Token pro Chunk mit 50 Token Ueberlappung. Trennt an natuerlichen Grenzen (Absaetze → Saetze → Woerter) um semantische Kohaerenz zu bewahren.
3. **Embeddings** (`lib/llm/local-embeddings.ts`): Lokale Inferenz via Transformers.js mit dem `all-MiniLM-L6-v2` ONNX-Modell. 384-dimensionale Vektoren werden direkt in Node.js generiert — kein externer API-Key erforderlich.
4. **Speicherung**: Chunks + Embeddings in der `document_chunks`-Tabelle mit HNSW-Index fuer schnelle Abfragen.

**Abfrage-Ablauf:**
1. Nutzer stellt eine Frage
2. Frage wird mit demselben lokalen Modell (all-MiniLM-L6-v2) eingebettet
3. **Retriever** (`lib/rag/retriever.ts`): pgvector Kosinus-Aehnlichkeitssuche. Top-5 Chunks ueber 0.3 Aehnlichkeitsschwelle. Nutzt eine dedizierte SQL-Funktion mit `security definer` fuer Titel-Attribution.
4. **Generator** (`lib/rag/generator.ts`): Erstellt einen strukturierten System-Prompt mit nummerierten Quellbloecken. **Claude Sonnet 4** (`claude-sonnet-4-20250514`) generiert eine Antwort, die auf den bereitgestellten Kontext beschraenkt ist, mit `[Source N]` Zitaten. Das Modell ist konfigurierbar via `ANTHROPIC_MODEL` Env-Variable.

**Begruendung der Chunking-Strategie:**
- 500 Tokens balancieren Kontextvollstaendigkeit mit Retrieval-Praezision
- 50 Token Ueberlappung verhindert Informationsverlust an Chunk-Grenzen
- Rekursives Splitting bewahrt Absatz-/Satzstruktur gegenueber willkuerlichen Schnitten

**Begruendung der Embedding-Strategie:**
- Lokales Modell eliminiert externe API-Abhaengigkeit und Kosten
- `all-MiniLM-L6-v2` ist ein bewaehrtes Modell fuer semantische Suche (MTEB-Benchmark)
- 384 Dimensionen sind ausreichend fuer RAG-Retrieval bei reduziertem Speicherbedarf

### Prompt Engineering

Der System-Prompt fuer den Generator folgt diesen Prinzipien:
- **Rollendefinition**: Explizite Identitaet als Wissensbasis-Assistent
- **Kontextbindung**: "Antworte NUR anhand der bereitgestellten Quellen" verhindert Halluzination
- **Zitationsformat**: "[Source N]" Referenzen fuer Nachvollziehbarkeit
- **Fallback-Verhalten**: Explizite Anweisung, es zu sagen wenn Quellen nicht ausreichen
- **Sprachanpassung**: Antwortet in der Sprache des Nutzers

### Design-Entscheidungen & Trade-offs

**Provider-Abstraktion:**
Separate Interfaces fuer `GenerationProvider` und `EmbeddingProvider`, da nicht alle LLMs beide Faehigkeiten bieten (Claude hat keine Embedding-API). Factory Pattern mit Singleton-Instanzen vermeidet wiederholte Initialisierung.

**Lokale Embeddings statt Cloud-API:**
Transformers.js mit einem ONNX-Modell laeuft direkt in Node.js und eliminiert die Notwendigkeit eines OpenAI API-Keys. Das Modell (~23MB) wird beim ersten Aufruf heruntergeladen und gecacht. Trade-off: Etwas niedrigere Embedding-Qualitaet als `text-embedding-3-small`, aber ausreichend fuer ein RAG-Demo-System.

**Nicht-streaming initialer Ansatz:**
Der Chat nutzt synchrones Request/Response statt Streaming fuer den MVP. Dies vereinfacht Fehlerbehandlung und Quellenattribution (Quellen werden zusammen mit der Antwort zurueckgegeben). Streaming kann durch Umschalten auf die vorhandene `streamAnswer()`-Funktion hinzugefuegt werden.

**Service-Client fuer Embeddings:**
Vektor-Einfuegungen nutzen den Supabase Service-Role-Client (umgeht RLS), da pgvector-Spalten spezielle Behandlung erfordern. Alle anderen Operationen nutzen den nutzerbezogenen Client mit RLS.

**Multi-Tenant via Workspaces:**
Jeder Workspace isoliert Dokumente, Chunks und Konversationen. RLS-Policies stellen sicher, dass Nutzer nur eigene Daten sehen. Die `workspace_id`-Spalte auf `document_chunks` ermoeglicht effiziente gefilterte Vektorsuche.

**HNSW vs IVFFlat Index:**
HNSW wurde gegenueber IVFFlat fuer den Vektor-Index gewaehlt, da es besseren Recall bei kleinen Datensets bietet, ohne Training zu erfordern — ideal fuer einen Demo-/Evaluierungskontext.

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
      local-embeddings.ts                 # Transformers.js lokaler Embedding-Adapter
    rag/                                  # Kern-RAG-Pipeline
      chunker.ts                          # Rekursiver Textsplitter
      embeddings.ts                       # Batch Embedding-Generierung
      retriever.ts                        # Vektor-Aehnlichkeitssuche
      generator.ts                        # Prompt-Konstruktion + LLM-Aufruf
    seed/                                 # Demo-Seed-Daten + Ingestion-Script
  types/index.ts                          # Gemeinsame TypeScript-Interfaces
  middleware.ts                           # Auth-Routenschutz
  __tests__/rag/                          # Unit-Tests
supabase/
  migration.sql                           # Datenbankschema + RLS + Funktionen
  migrate-384.sql                         # Migration fuer lokale Embedding-Dimensionen
```

## Setup & Ausfuehrung

### Voraussetzungen
- Node.js 18+
- Supabase-Projekt (Free Tier reicht aus)
- Anthropic API-Key (Claude)

> **Hinweis:** Embeddings laufen lokal via Transformers.js — kein OpenAI-Key noetig.

### 1. Klonen & Installieren

```bash
git clone <repo-url>
cd rag-knowledge-hub
npm install
```

### 2. Supabase einrichten

1. Neues Projekt erstellen auf [supabase.com](https://supabase.com)
2. Im **SQL Editor** den Inhalt von `supabase/migration.sql` ausfuehren
3. Unter **Authentication → Settings** die Option "Confirm email" bei Email Auth deaktivieren
4. Projekt-URL und Keys unter **Settings → API** kopieren

### 3. Umgebungsvariablen

`.env.example` nach `.env.local` kopieren und ausfuellen:

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

Oeffne [http://localhost:3000](http://localhost:3000).

### 5. Wissensbasis seeden

Nach Registrierung und Login auf **"Seed Demo Data"** im Dashboard klicken. Dies erstellt einen "AI Engineering Handbook" Workspace mit 7 vorgefertigten Dokumenten zu KI/ML-Engineering-Themen. Die Dokumente werden automatisch in Chunks aufgeteilt und eingebettet.

Der erste Seed kann ca. 30 Sekunden dauern, da das Embedding-Modell (~23MB) heruntergeladen und gecacht wird.

### 6. Tests ausfuehren

```bash
npm test
```

## Moegliche Erweiterungen

- **Streaming-Antworten**: Umschalten von `generateAnswer` auf `streamAnswer` fuer Echtzeit-Token-Ausgabe
- **Datei-Upload**: PDF/DOCX serverseitig parsen vor dem Chunking
- **Hybride Suche**: Vektor-Aehnlichkeit mit Volltextsuche (BM25) kombinieren fuer besseren Recall
- **Re-Ranking**: Cross-Encoder Re-Ranking-Schritt nach initialem Retrieval
- **Konversationskontext**: Vorherige Nachrichten im Generator-Prompt fuer Folgefragen einbeziehen
- **Admin-Dashboard**: Nutzungsanalytik, Dokumentverwaltung ueber Workspaces
- **Rate Limiting**: Token-basiertes Rate Limiting auf der Chat-API
- **Deployment**: Vercel + Supabase gehostetes Projekt fuer Live-Demo
