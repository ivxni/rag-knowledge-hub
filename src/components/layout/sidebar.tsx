"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, FolderOpen, LayoutDashboard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/types";

interface SidebarProps {
  user: User;
}

export function Sidebar({ user: _user }: SidebarProps) {
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  function fetchWorkspaces() {
    fetch(`/api/workspaces?t=${Date.now()}`)
      .then((r) => r.json())
      .then(setWorkspaces)
      .catch(() => {});
  }

  useEffect(() => {
    fetchWorkspaces();
    const handler = () => fetchWorkspaces();
    window.addEventListener("workspaces-changed", handler);
    return () => window.removeEventListener("workspaces-changed", handler);
  }, []);

  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-semibold">Knowledge Hub</span>
      </div>

      <div className="p-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            pathname === "/dashboard" && "bg-accent"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      <Separator />

      <div className="px-4 pt-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
          Workspaces
        </p>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        {workspaces.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">
            No workspaces yet
          </p>
        ) : (
          <nav className="space-y-1">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname?.startsWith(`/workspace/${ws.id}`) && "bg-accent font-medium"
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{ws.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </ScrollArea>
    </aside>
  );
}
