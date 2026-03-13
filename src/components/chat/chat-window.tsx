"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { Brain } from "lucide-react";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
}

export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <div className="max-w-xs space-y-1">
          <p className="font-semibold">Ask a question</p>
          <p className="text-sm text-muted-foreground">
            Your answers will be grounded in the workspace documents. Make sure
            you have documents ingested first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
            </div>
            Thinking...
          </div>
        )}
      </div>
    </div>
  );
}
