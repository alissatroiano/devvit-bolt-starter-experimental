export interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  difficulty: 'easy' | 'medium' | 'hard';
  found: boolean;
  foundBy?: string;
  foundAt?: number;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  foundImpostors: string[];
  timeStarted?: number;
  timeCompleted?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  score: number;
  timeCompleted?: number;
}

export interface GameState {
  id: string;
  phase: 'waiting' | 'playing' | 'ended';
  players: Record<string, Player>;
  impostors: Impostor[];
  host: string;
  timeLimit: number;
  timeLeft?: number;
  gameStartTime?: number;
  gameEndTime?: number;
  winner?: string;
  leaderboard: LeaderboardEntry[];
}

export interface GameResult {
  score: number;
  time: number;
  completedAt: number;
}