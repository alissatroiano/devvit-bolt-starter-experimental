export type GamePhase = 'waiting' | 'playing' | 'ended';
export type PlayerStatus = 'playing' | 'found' | 'winner';

export interface Player {
  id: string;
  username: string;
  score: number;
  foundImpostors: string[];
  timeStarted?: number;
  timeCompleted?: number;
}

export interface Impostor {
  id: string;
  x: number; // percentage position
  y: number; // percentage position
  width: number;
  height: number;
  difficulty: 'easy' | 'medium' | 'hard';
  found: boolean;
  foundBy?: string; // player ID who found it
  foundAt?: number; // timestamp
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Record<string, Player>;
  impostors: Impostor[];
  host: string;
  gameStartTime?: number;
  gameEndTime?: number;
  timeLimit: number; // seconds
  timeLeft?: number;
  winner?: string; // player ID
  leaderboard: Array<{
    playerId: string;
    username: string;
    score: number;
    timeCompleted?: number;
  }>;
}

// API Response types
type Response<T> = { status: 'error'; message: string } | ({ status: 'success' } & T);

export type JoinGameResponse = Response<{
  gameState: GameState;
  playerId: string;
}>;

export type GameStateResponse = Response<{
  gameState: GameState;
}>;

export type StartGameResponse = Response<{
  gameState: GameState;
}>;

export type FindImpostorResponse = Response<{
  gameState: GameState;
  found: boolean;
  impostor?: Impostor;
  score: number;
}>;