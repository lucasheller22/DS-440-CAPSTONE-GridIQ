import { z } from "zod";
import { api } from "./client";
import type { ChatMessage, Game, Play, User } from "../../types";

// helper used throughout the module so the "use mocks" toggle can be
// changed at runtime via settings.  For now we force the mock environment
// unconditionally so the app works completely offline (no network needed).
function useMocks() {
  // always use mocks regardless of env vars; simplifies no-network testing
  return true;
}

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
  // when mocks are enabled we bypass the network entirely.  the helper
  // is already hard‑wired to return true in this build.
  if (useMocks()) {
    if (!email || !password) throw new Error("Missing credentials");
    const user: User = { id: "u_1", email, displayName: "Coach", role: "coach" };
    const token = "dev-token";
    return { token, user };
  }

  const resp = await api.post("/api/auth/login", { email, password });
  return resp.data;
}

export async function me(): Promise<User> {
  if (useMocks()) {
    const raw = localStorage.getItem("gridiq_user");
    if (!raw) throw new Error("Not authenticated");
    const parsed = JSON.parse(raw);
    return UserSchema.parse(parsed);
  }

  const resp = await api.get("/api/auth/me");
  return UserSchema.parse(resp.data);
}

// sample fixtures used when mocks are enabled
const _mockGames: Game[] = [
  {
    id: "g_1",
    season: 2026,
    week: 5,
    homeTeam: "Penn State",
    awayTeam: "Ohio State",
    kickoff: new Date("2026-10-03T19:00:00Z").toISOString(),
  },
  {
    id: "g_2",
    season: 2026,
    week: 6,
    homeTeam: "Michigan",
    awayTeam: "Michigan State",
    kickoff: new Date("2026-10-10T19:00:00Z").toISOString(),
  },
];

const _mockPlays: Play[] = [
  {
    id: "p_1",
    gameId: "g_1",
    offense: "Penn State",
    defense: "Ohio State",
    down: 3,
    yardsToGo: 7,
    yardLine: 45,
    playType: "Pass",
    description: "3rd and 7, shotgun, quick out to WR",
  },
  {
    id: "p_2",
    gameId: "g_1",
    offense: "Penn State",
    defense: "Ohio State",
    down: 1,
    yardsToGo: 10,
    yardLine: 20,
    playType: "Run",
    description: "Inside zone left for 4 yards",
  },
];

export async function listGames(): Promise<Game[]> {
  if (useMocks()) {
    // allow a little artificial latency so the UI shows loading states
    await new Promise((r) => setTimeout(r, 250));
    return _mockGames;
  }

  const resp = await api.get("/api/games");
  return resp.data;
}

export async function listPlays(gameId: string): Promise<Play[]> {
  if (useMocks()) {
    await new Promise((r) => setTimeout(r, 250));
    return _mockPlays.filter((p) => p.gameId === gameId);
  }

  const resp = await api.get(`/api/games/${gameId}/plays`);
  return resp.data;
}


export async function listThreadMessages(threadId: string): Promise<ChatMessage[]> {
  if (useMocks()) {
    const raw = localStorage.getItem(`gridiq_thread_${threadId}`);
    return raw ? z.array(ChatMessageSchema).parse(JSON.parse(raw)) : [];
  }
  const resp = await api.get(`/api/chat/threads/${threadId}`);
  return resp.data;
}

export async function sendMessage(threadId: string, content: string): Promise<ChatMessage> {
  if (useMocks()) {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      threadId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const current = await listThreadMessages(threadId);
    const next = [...current, msg];
    localStorage.setItem(`gridiq_thread_${threadId}`, JSON.stringify(next));
    return msg;
  }

  const resp = await api.post(`/api/chat/threads/${threadId}/messages`, { content });
  return resp.data;
}
