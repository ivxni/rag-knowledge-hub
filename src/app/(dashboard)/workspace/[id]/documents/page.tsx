"use client";

import { useEffect, useState, use } from "react";
import { Plus, FileText, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Document } from "@/types";

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = use(params);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [workspaceId]);

  async function fetchDocuments() {
    const res = await fetch(`/api/documents?workspace_id=${workspaceId}`);
    if (res.ok) setDocuments(await res.json());
    setLoading(false);
  }

  async function handleIngest() {
    if (!title.trim() || !content.trim()) return;
    setIngesting(true);

    const res = await fetch("/api/documents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, title, content }),
    });

    if (res.ok) {
      setTitle("");
      setContent("");
      setOpen(false);
      fetchDocuments();
    }
    setIngesting(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (viewingDoc?.id === id) setViewingDoc(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 gap-4 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in this workspace
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add document
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add document</DialogTitle>
                <DialogDescription>
                  Paste text content to be chunked, embedded, and indexed for
                  retrieval.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="doc-title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Prompt Engineering Guide"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="doc-content" className="text-sm font-medium">
                    Content
                  </label>
                  <Textarea
                    id="doc-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your document text here..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleIngest}
                  disabled={ingesting || !title.trim() || !content.trim()}
                >
                  {ingesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Ingest document"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {documents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No documents yet.</p>
              <p className="text-sm text-muted-foreground">
                Add documents to build your knowledge base.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:ring-1 hover:ring-primary/30 ${viewingDoc?.id === doc.id ? "ring-1 ring-primary" : ""}`}
                onClick={() => setViewingDoc(doc)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {doc.content.slice(0, 120).replace(/\n/g, " ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {doc.chunk_count} chunks
                  </Badge>
                  <span className="hidden text-[10px] text-muted-foreground whitespace-nowrap sm:inline">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingDoc && (
        <div className="hidden w-96 shrink-0 flex-col rounded-lg border bg-card lg:flex">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="truncate pr-2 text-sm font-semibold">
              {viewingDoc.title}
            </h3>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setViewingDoc(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <Badge variant="secondary" className="text-[10px]">
              {viewingDoc.chunk_count} chunks
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(viewingDoc.created_at).toLocaleDateString()}
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
                {viewingDoc.content}
              </pre>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
