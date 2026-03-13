"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain } from "lucide-react";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
}

export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            Your answers will be grounded in the workspace documents. Make sure you have documents ingested first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
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
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
