"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  BookOpen,
  Loader2,
  ArrowRight,
  FileText,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import type { Workspace } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [docCount, setDocCount] = useState(0);
  const [convCount, setConvCount] = useState(0);

  async function refresh() {
    const ts = Date.now();
    const res = await fetch(`/api/workspaces?_=${ts}`);
    if (!res.ok) return;

    const wsList: Workspace[] = await res.json();
    setWorkspaces(wsList);
    setLoading(false);

    // Notify sidebar to sync
    window.dispatchEvent(new Event("workspaces-changed"));

    // Fetch stats in parallel
    let docs = 0;
    let convs = 0;
    await Promise.all(
      wsList.map(async (ws) => {
        const [docRes, convRes] = await Promise.all([
          fetch(`/api/documents?workspace_id=${ws.id}&_=${ts}`),
          fetch(`/api/conversations?workspace_id=${ws.id}&_=${ts}`),
        ]);
        if (docRes.ok) docs += (await docRes.json()).length;
        if (convRes.ok) convs += (await convRes.json()).length;
      })
    );
    setDocCount(docs);
    setConvCount(convs);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      setName("");
      setDescription("");
      setOpen(false);
    }
    await refresh();
    setCreating(false);
  }

  async function handleDeleteWorkspace(id: string) {
    await fetch(`/api/workspaces?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) {
        console.error("Seed failed:", await res.text());
      }
    } catch (error) {
      console.error("Seeding failed", error);
    } finally {
      await refresh();
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Each workspace contains its own documents and conversations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New workspace
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
              <DialogDescription>
                A workspace isolates your documents and conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="ws-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Engineering"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ws-desc" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="ws-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding || creating}
        >
          {seeding ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          )}
          {seeding ? "Generating..." : "Seed Demo Data"}
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="mt-4 font-medium">No workspaces yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace or generate demo data to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="group cursor-pointer transition-all hover:ring-1 hover:ring-primary/30"
              onClick={() => router.push(`/workspace/${ws.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">
                      {ws.name}
                    </CardTitle>
                    {ws.name === "AI Engineering Handbook" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Demo
                      </Badge>
                    )}
                  </div>
                  {ws.description && (
                    <CardDescription className="mt-0.5 text-xs">
                      {ws.description}
                    </CardDescription>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Created{" "}
                    {new Date(ws.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkspace(ws.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-muted/30">
            <CardContent className="flex items-center gap-3 p-4">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{workspaces.length}</p>
                <p className="text-[11px] text-muted-foreground">Workspaces</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{docCount}</p>
                <p className="text-[11px] text-muted-foreground">Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="flex items-center gap-3 p-4">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{convCount}</p>
                <p className="text-[11px] text-muted-foreground">Conversations</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
