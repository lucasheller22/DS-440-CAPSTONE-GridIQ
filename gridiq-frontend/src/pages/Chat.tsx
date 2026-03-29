import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import * as api from "../lib/api/endpoints";
import type { ChatMessage } from "../types";
import axios from "axios";

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "max-w-[80%] rounded-2xl bg-gray-900 p-3 text-sm text-white" : "max-w-[80%] rounded-2xl bg-gray-100 p-3 text-sm"}>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {msg.citations?.length ? (
          <div className="mt-2 space-y-1 text-xs opacity-90">
            <div className="font-medium">Citations</div>
            {msg.citations.map((c, i) => (
              <div key={i} className="rounded-xl bg-white/10 px-2 py-1">
                {c.title}
                {c.snippet ? <div className="mt-0.5 opacity-80">{c.snippet}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Chat() {
  const threadId = useMemo(() => "default", []);
  const qc = useQueryClient();

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => api.listThreadMessages(threadId),
    refetchOnWindowFocus: false,
  });

  const send = useMutation({
    mutationFn: (content: string) => api.sendMessage(threadId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
  });

  const [text, setText] = useState("");

  useEffect(() => {
    // Optional: setup streaming (SSE/WebSocket) once backend supports it.
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Chat</div>
        <div className="mt-1 text-sm text-gray-600">
          Threaded chat UI using backend Chat API (real auth + persistence). Implement streaming once available.
        </div>
      </div>

      <Card className="space-y-3">
        <div className="h-[52vh] space-y-2 overflow-auto rounded-xl border border-gray-100 bg-white p-3">
          {isLoadingMessages ? (
            <div className="text-sm text-gray-500">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-gray-500">
              No messages yet. Ask something like: “Explain Cover 3 vs Quarters for 3x1 formations.”
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>

        {send.isError ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {(() => {
              const err = send.error;
              if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail;
                if (typeof detail === "string") return detail;
                return err.message;
              }
              return err instanceof Error ? err.message : "Failed to send message";
            })()}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            placeholder="Type a question…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!text.trim()) return;
                send.mutate(text.trim());
                setText("");
              }
            }}
          />
          <Button
            disabled={send.isPending}
            onClick={() => {
              if (!text.trim()) return;
              send.mutate(text.trim());
              setText("");
            }}
          >
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
