"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const id = params.id as string;
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspace() {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const workspaces = await res.json();
        const ws = workspaces.find((w: { id: string }) => w.id === id);
        setWorkspaceName(ws?.name ?? "Workspace");
      } else {
        setWorkspaceName("Workspace");
      }
    }
    fetchWorkspace();
  }, [id]);

  const isChat =
    pathname === `/workspace/${id}` || pathname === `/workspace/${id}/`;
  const isDocuments = pathname === `/workspace/${id}/documents`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">
          {workspaceName ?? "Loading..."}
        </h1>
        <nav className="mt-2 inline-flex h-8 items-center gap-1">
          <Link
            href={`/workspace/${id}`}
            className={cn(
              "relative inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:text-foreground",
              isChat
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground"
            )}
          >
            Chat
          </Link>
          <Link
            href={`/workspace/${id}/documents`}
            className={cn(
              "relative inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:text-foreground",
              isDocuments
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground"
            )}
          >
            Documents
          </Link>
        </nav>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
