"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  return (
    <div className="hidden w-56 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </p>
        <Button variant="ghost" size="icon-xs" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5">
          {loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Start a new conversation
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                    activeId === conv.id && "bg-accent font-medium"
                  )}
                  onClick={() => onSelect(conv.id)}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
