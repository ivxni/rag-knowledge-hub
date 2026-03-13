"use client";

import { Brain, User } from "lucide-react";
import { SourceCard } from "./source-card";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[80%] space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <div className="whitespace-pre-wrap text-left">{message.content}</div>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5 text-left">
            <p className="text-xs font-medium text-muted-foreground">
              Sources ({message.sources.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
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
