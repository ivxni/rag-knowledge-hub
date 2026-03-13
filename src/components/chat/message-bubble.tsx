"use client";

import { Brain, User } from "lucide-react";
import { SourceCard } from "./source-card";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="mt-3 mb-1 text-sm font-bold first:mt-0">
          {renderInline(line.slice(3))}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={i} className="mt-3 mb-1 text-base font-bold first:mt-0">
          {renderInline(line.slice(2))}
        </h2>
      );
    }
    if (/^[-*] /.test(line)) {
      return (
        <li key={i} className="ml-4 list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    }
    if (/^\d+\. /.test(line)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i}>
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[Source \d+\]$/.test(part)) {
      return (
        <span key={i} className="rounded bg-primary/15 px-1 py-0.5 text-[11px] font-medium text-primary">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-[85%] space-y-2",
          isUser && "text-right"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <div className="break-words text-left">
            {isUser ? message.content : renderMarkdown(message.content)}
          </div>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5 text-left">
            <p className="text-[11px] font-medium text-muted-foreground">
              Sources ({message.sources.length})
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {message.sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
