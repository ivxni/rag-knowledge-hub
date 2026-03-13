"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SourceReference } from "@/types";

interface SourceCardProps {
  source: SourceReference;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">
          [{index}] {source.document_title}
        </span>
        <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
          {(source.similarity * 100).toFixed(0)}%
        </Badge>
      </div>
      {expanded && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
          {source.content}
        </p>
      )}
    </button>
  );
}
