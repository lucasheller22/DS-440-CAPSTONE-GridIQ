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
  thread_id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  created_at: z.string(),
  citations: z
    .array(z.object({ title: z.string(), url: z.string().optional(), snippet: z.string().optional() }))
    .optional(),
}).transform((msg) => ({
  id: msg.id,
  threadId: msg.thread_id,
  role: msg.role,
  content: msg.content,
  createdAt: msg.created_at,
  citations: msg.citations,
}));

const ThreadSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  messages: z.array(ChatMessageSchema),
}).transform((thread) => ({
  id: thread.id,
  userId: thread.user_id,
  title: thread.title,
  createdAt: thread.created_at,
  updatedAt: thread.updated_at,
  messages: thread.messages,
}));

export async function listThreads(): Promise<z.infer<typeof ThreadSchema>[]> {
  const response = await api.get("/chat/threads");
  return z.array(ThreadSchema).parse(response.data);
}

export async function createThread(title: string): Promise<z.infer<typeof ThreadSchema>> {
  const response = await api.post("/chat/threads", { title });
  return ThreadSchema.parse(response.data);
}

export async function register(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await api.post("/auth/register", { email, password });
  const { token, user } = response.data;
  return { token, user };
}

export async function me(): Promise<User> {
  const response = await api.get("/users/me");
  return UserSchema.parse(response.data);
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
  const response = await api.get(`/chat/threads/${threadId}`);
  const thread = response.data;
  return z.array(ChatMessageSchema).parse(thread.messages);
}

export async function sendMessage(threadId: string, content: string): Promise<ChatMessage> {
  const response = await api.post(`/chat/threads/${threadId}/messages`, { message: content });
  return ChatMessageSchema.parse(response.data.message);
}
