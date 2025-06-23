export type PlayerRole = 'crewmate' | 'impostor';
export type PlayerStatus = 'alive' | 'dead' | 'disconnected';
export type GamePhase = 'waiting' | 'playing' | 'discussion' | 'voting' | 'ended';

export interface Player {
  id: string;
  username: string;
  role: PlayerRole;
  status: PlayerStatus;
  position: { x: number; y: number };
  tasksCompleted: number;
  totalTasks: number;
  hasVoted: boolean;
  votedFor?: string;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Record<string, Player>;
  host: string;
  winner?: 'crewmates' | 'impostors';
  discussionTimeLeft?: number;
  votingTimeLeft?: number;
  meetingCaller?: string;
  eliminatedPlayer?: string;
  gameStartTime?: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  location: string;
  completed: boolean;
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

export type ActionResponse = Response<{
  gameState: GameState;
  message?: string;
}>;

export type StartGameResponse = Response<{
  gameState: GameState;
}>;

export type VoteResponse = Response<{
  gameState: GameState;
}>;

export type CompleteTaskResponse = Response<{
  gameState: GameState;
  taskCompleted: boolean;
}>;