import { z } from "zod";
import { api } from "./client";
import type { ChatMessage, Game, Play, User } from "../../types";

// Zod schemas (runtime validation)
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["coach", "player", "analyst", "admin"]),
});

const ChatMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string(),
  citations: z
    .array(z.object({ title: z.string(), url: z.string().optional(), snippet: z.string().optional() }))
    .optional(),
});

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  // Swap this to your backend when ready.
  // For now we "mock" login locally.
  if (!email || !password) throw new Error("Missing credentials");
  const user: User = { id: "u_1", email, displayName: "Coach", role: "coach" };
  const token = "dev-token";
  return { token, user };
}

export async function me(): Promise<User> {
  // In a real backend: GET /me
  // Here: infer from localStorage
  const raw = localStorage.getItem("gridiq_user");
  if (!raw) throw new Error("Not authenticated");
  const parsed = JSON.parse(raw);
  return UserSchema.parse(parsed);
}

export async function listGames(): Promise<Game[]> {
  // Real backend: GET /games
  // Placeholder: return empty list so you can wire UI
  return [];
}

export async function listPlays(gameId: string): Promise<Play[]> {
  // Real backend: GET /games/:id/plays
  void gameId;
  return [];
}

export async function listThreadMessages(threadId: string): Promise<ChatMessage[]> {
  // Real backend: GET /chat/threads/:id
  void threadId;
  const raw = localStorage.getItem(`gridiq_thread_${threadId}`);
  return raw ? z.array(ChatMessageSchema).parse(JSON.parse(raw)) : [];
}

export async function sendMessage(threadId: string, content: string): Promise<ChatMessage> {
  // Real backend: POST /chat/threads/:id/messages (streaming SSE/websocket recommended)
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    threadId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
  // Persist locally for now.
  const current = await listThreadMessages(threadId);
  const next = [...current, msg];
  localStorage.setItem(`gridiq_thread_${threadId}`, JSON.stringify(next));
  return msg;
}
