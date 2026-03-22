import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import * as api from "../lib/api/endpoints";
import type { ChatMessage } from "../types";

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Get all threads
  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => api.listThreads(),
  });

  // Set the first thread as active, or create one
  useEffect(() => {
    if (threads.length > 0 && !threadId) {
      setThreadId(threads[0].id);
    } else if (threads.length === 0 && !threadId) {
      // Create a default thread
      api.createThread("Default Chat").then((thread) => {
        setThreadId(thread.id);
        qc.invalidateQueries({ queryKey: ["threads"] });
      });
    }
  }, [threads, threadId, qc]);

  const { data: messages = [] } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => threadId ? api.listThreadMessages(threadId) : Promise.resolve([]),
    enabled: !!threadId,
  });

  const send = useMutation({
    mutationFn: (content: string) => threadId ? api.sendMessage(threadId, content) : Promise.reject("No thread"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thread", threadId] }),
  });

  const [text, setText] = useState("");

  useEffect(() => {
    // TODO: replace with SSE/websocket streaming when backend is ready.
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Chat</div>
        <div className="mt-1 text-sm text-gray-600">
          Threaded chat UI (local persistence for now). Swap API calls to your backend for real responses + streaming.
        </div>
      </div>

      <Card className="space-y-3">
        <div className="h-[52vh] space-y-2 overflow-auto rounded-xl border border-gray-100 bg-white p-3">
          {messages.length === 0 ? (
            <div className="text-sm text-gray-500">
              No messages yet. Ask something like: “Explain Cover 3 vs Quarters for 3x1 formations.”
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>

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
