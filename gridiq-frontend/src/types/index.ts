export type Role = "coach" | "player" | "analyst" | "admin";

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string; // ISO
  citations?: Array<{ title: string; url?: string; snippet?: string }>;
};

export type Game = {
  id: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string; // ISO
};

export type Play = {
  id: string;
  gameId: string;
  offense: string;
  defense: string;
  down: number;
  yardsToGo: number;
  yardLine: number; // 0..100
  playType: string;
  description: string;
};
