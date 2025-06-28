export interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  found: boolean;
}

export interface GameState {
  phase: 'menu' | 'playing' | 'ended';
  timeLeft: number;
  score: number;
  impostors: Impostor[];
  startTime?: number;
  endTime?: number;
}

export interface GameResult {
  score: number;
  time: number;
  completedAt: number;
}