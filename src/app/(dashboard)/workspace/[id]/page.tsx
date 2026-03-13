"use client";

import { useEffect, useState, use } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationList } from "@/components/chat/conversation-list";
import type { Conversation, Message, SourceReference } from "@/types";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = use(params);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [workspaceId]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  async function fetchConversations() {
    setLoading(true);
    const res = await fetch(`/api/conversations?workspace_id=${workspaceId}`);
    if (res.ok) setConversations(await res.json());
    setLoading(false);
  }

  async function fetchMessages(conversationId: string) {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) setMessages(await res.json());
  }

  async function handleSend(query: string) {
    if (sending) return;
    setSending(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation ?? "",
      role: "user",
      content: query,
      sources: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          conversation_id: activeConversation,
          query,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const data: {
        answer: string;
        sources: SourceReference[];
        conversation_id: string;
      } = await res.json();

      if (!activeConversation) {
        setActiveConversation(data.conversation_id);
        fetchConversations();
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: data.conversation_id,
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: activeConversation ?? "",
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        sources: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }

  function handleNewConversation() {
    setActiveConversation(null);
    setMessages([]);
  }

  async function handleDeleteConversation(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation === id) {
      setActiveConversation(null);
      setMessages([]);
    }
  }

  return (
    <div className="flex h-full min-h-0 rounded-lg border bg-card">
      <ConversationList
        conversations={conversations}
        activeId={activeConversation}
        loading={loading}
        onSelect={setActiveConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <ChatWindow messages={messages} loading={sending} />
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
