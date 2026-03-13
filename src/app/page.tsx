import Link from "next/link";
import { Brain, MessageSquare, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Knowledge Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Your knowledge base,
              <br />
              <span className="text-primary">powered by AI</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Upload documents, ask questions, and get accurate answers grounded
              in your own data. Built with Retrieval-Augmented Generation for
              reliable, source-cited responses.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Start for free</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 px-6 py-20">
          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Document Ingestion</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents that get automatically chunked, embedded, and
                indexed for semantic search.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Conversational Q&A</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions in natural language and receive answers with source
                citations from your knowledge base.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Multi-Workspace</h3>
              <p className="text-sm text-muted-foreground">
                Organize knowledge into isolated workspaces with row-level
                security for complete data separation.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Built with Next.js, Supabase, and Claude AI
      </footer>
    </div>
  );
}
