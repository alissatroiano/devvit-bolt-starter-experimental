import { Context } from '@devvit/public-api';
import { RedisClient } from '@devvit/redis';
import { GameState, Player, Impostor } from '../../shared/types/game';

const GAME_EXPIRY = 60 * 60 * 4; // 4 hours
const TIME_LIMIT = 300; // 5 minutes
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 20;

const getGameKey = (postId: string) => `game:${postId}` as const;

// Predefined impostor locations for the crowd scene
const IMPOSTOR_LOCATIONS: Omit<Impostor, 'id' | 'found' | 'foundBy' | 'foundAt'>[] = [
  // Easy to spot (larger, more obvious)
  { x: 15, y: 25, width: 8, height: 12, difficulty: 'easy' },
  { x: 75, y: 40, width: 7, height: 11, difficulty: 'easy' },
  { x: 45, y: 70, width: 8, height: 13, difficulty: 'easy' },
  
  // Medium difficulty (smaller, partially hidden)
  { x: 30, y: 15, width: 5, height: 8, difficulty: 'medium' },
  { x: 85, y: 60, width: 6, height: 9, difficulty: 'medium' },
  { x: 20, y: 80, width: 5, height: 7, difficulty: 'medium' },
  { x: 65, y: 20, width: 6, height: 8, difficulty: 'medium' },
  
  // Hard to spot (very small, well hidden)
  { x: 55, y: 35, width: 3, height: 5, difficulty: 'hard' },
  { x: 10, y: 55, width: 4, height: 6, difficulty: 'hard' },
  { x: 90, y: 25, width: 3, height: 4, difficulty: 'hard' },
  { x: 40, y: 85, width: 4, height: 5, difficulty: 'hard' },
  { x: 70, y: 75, width: 3, height: 5, difficulty: 'hard' },
];

export const createGame = async ({
  redis,
  postId,
  hostId,
  hostUsername,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
  hostId: string;
  hostUsername: string;
}): Promise<GameState> => {
  // Generate impostors with unique IDs
  const impostors: Impostor[] = IMPOSTOR_LOCATIONS.map((location, index) => ({
    ...location,
    id: `impostor_${index}`,
    found: false,
  }));

  const gameState: GameState = {
    id: postId,
    phase: 'waiting',
    players: {},
    impostors,
    host: hostId,
    timeLimit: TIME_LIMIT,
    leaderboard: [],
  };

  const host: Player = {
    id: hostId,
    username: hostUsername,
    score: 0,
    foundImpostors: [],
  };

  gameState.players[hostId] = host;

  // Use set with expiration instead of setEx
  await redis.set(getGameKey(postId), JSON.stringify(gameState), { expiration: new Date(Date.now() + GAME_EXPIRY * 1000) });
  return gameState;
};

export const getGame = async ({
  redis,
  postId,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
}): Promise<GameState | null> => {
  const gameData = await redis.get(getGameKey(postId));
  return gameData ? JSON.parse(gameData) : null;
};

export const updateGame = async ({
  redis,
  gameState,
}: {
  redis: Context['redis'] | RedisClient | any;
  gameState: GameState;
}): Promise<void> => {
  // Use set with expiration instead of setEx
  await redis.set(getGameKey(gameState.id), JSON.stringify(gameState), { expiration: new Date(Date.now() + GAME_EXPIRY * 1000) });
};

export const joinGame = async ({
  redis,
  postId,
  playerId,
  username,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
  playerId: string;
  username: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
    return null; // Game full
  }

  if (gameState.players[playerId]) {
    return gameState; // Already in game
  }

  const player: Player = {
    id: playerId,
    username,
    score: 0,
    foundImpostors: [],
  };

  if (gameState.phase === 'playing') {
    player.timeStarted = Date.now();
  }

  gameState.players[playerId] = player;
  await updateGame({ redis, gameState });
  return gameState;
};

export const startGame = async ({
  redis,
  postId,
  playerId,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
  playerId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  if (gameState.host !== playerId) return null; // Only host can start
  if (gameState.phase !== 'waiting') return null; // Already started

  const playerCount = Object.keys(gameState.players).length;
  if (playerCount < MIN_PLAYERS) return null; // Not enough players

  gameState.phase = 'playing';
  gameState.gameStartTime = Date.now();
  gameState.timeLeft = TIME_LIMIT;

  // Set start time for all players
  Object.values(gameState.players).forEach((player) => {
    player.timeStarted = Date.now();
  });

  await updateGame({ redis, gameState });
  return gameState;
};

export const findImpostor = async ({
  redis,
  postId,
  playerId,
  x,
  y,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
  playerId: string;
  x: number;
  y: number;
}): Promise<{ gameState: GameState | null; found: boolean; impostor?: Impostor; score: number }> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return { gameState: null, found: false, score: 0 };

  const player = gameState.players[playerId];
  if (!player || gameState.phase !== 'playing') {
    return { gameState, found: false, score: player?.score || 0 };
  }

  // Check if click is within any impostor's bounds
  const foundImpostor = gameState.impostors.find(impostor => {
    if (impostor.found) return false;
    
    const withinX = x >= impostor.x && x <= impostor.x + impostor.width;
    const withinY = y >= impostor.y && y <= impostor.y + impostor.height;
    
    return withinX && withinY;
  });

  if (foundImpostor) {
    // Mark impostor as found
    foundImpostor.found = true;
    foundImpostor.foundBy = playerId;
    foundImpostor.foundAt = Date.now();

    // Add to player's found list
    player.foundImpostors.push(foundImpostor.id);

    // Calculate score based on difficulty and time
    let points = 0;
    switch (foundImpostor.difficulty) {
      case 'easy': points = 10; break;
      case 'medium': points = 25; break;
      case 'hard': points = 50; break;
    }

    // Time bonus (faster = more points)
    const timeElapsed = (Date.now() - (player.timeStarted || Date.now())) / 1000;
    const timeBonus = Math.max(0, Math.floor((TIME_LIMIT - timeElapsed) / 10));
    
    player.score += points + timeBonus;

    // Check if all impostors found or if this player found them all
    const allFound = gameState.impostors.every(imp => imp.found);
    const playerFoundAll = player.foundImpostors.length === gameState.impostors.length;

    if (allFound || playerFoundAll) {
      gameState.phase = 'ended';
      gameState.gameEndTime = Date.now();
      gameState.winner = playerId;
      player.timeCompleted = Date.now();

      // Update leaderboard
      updateLeaderboard(gameState);
    }

    await updateGame({ redis, gameState });
    return { gameState, found: true, impostor: foundImpostor, score: player.score };
  }

  return { gameState, found: false, score: player.score };
};

export const updateGameTimer = async ({
  redis,
  postId,
}: {
  redis: Context['redis'] | RedisClient | any;
  postId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState || gameState.phase !== 'playing') return gameState;

  const elapsed = Math.floor((Date.now() - (gameState.gameStartTime || Date.now())) / 1000);
  gameState.timeLeft = Math.max(0, TIME_LIMIT - elapsed);

  if (gameState.timeLeft === 0) {
    gameState.phase = 'ended';
    gameState.gameEndTime = Date.now();
    
    // Find winner (highest score)
    const players = Object.values(gameState.players);
    const winner = players.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    if (winner.score > 0) {
      gameState.winner = winner.id;
    }

    updateLeaderboard(gameState);
  }

  await updateGame({ redis, gameState });
  return gameState;
};

function updateLeaderboard(gameState: GameState): void {
  gameState.leaderboard = Object.values(gameState.players)
    .map(player => ({
      playerId: player.id,
      username: player.username,
      score: player.score,
      ...(player.timeCompleted && { timeCompleted: player.timeCompleted }), // Only include if defined
    }))
    .sort((a, b) => {
      // Sort by score first, then by completion time
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeCompleted && b.timeCompleted) {
        return a.timeCompleted - b.timeCompleted;
      }
      return 0;
    });
}