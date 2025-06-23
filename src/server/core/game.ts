import { Context } from '@devvit/public-api';
import { RedisClient } from '@devvit/redis';
import { GameState, Player, PlayerRole, PlayerStatus } from '../../shared/types/game';

const GAME_EXPIRY = 60 * 60 * 4; // 4 hours
const DISCUSSION_TIME = 45; // seconds
const VOTING_TIME = 30; // seconds
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 10;

const getGameKey = (postId: string) => `game:${postId}` as const;
const getPlayerKey = (postId: string, playerId: string) => `player:${postId}:${playerId}` as const;

export const createGame = async ({
  redis,
  postId,
  hostId,
  hostUsername,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  hostId: string;
  hostUsername: string;
}): Promise<GameState> => {
  const gameState: GameState = {
    id: postId,
    phase: 'waiting',
    players: {},
    host: hostId,
  };

  const host: Player = {
    id: hostId,
    username: hostUsername,
    role: 'crewmate',
    status: 'alive',
    position: { x: 50, y: 50 },
    tasksCompleted: 0,
    totalTasks: 3,
    hasVoted: false,
  };

  gameState.players[hostId] = host;

  await redis.setEx(getGameKey(postId), GAME_EXPIRY, JSON.stringify(gameState));
  return gameState;
};

export const getGame = async ({
  redis,
  postId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
}): Promise<GameState | null> => {
  const gameData = await redis.get(getGameKey(postId));
  return gameData ? JSON.parse(gameData) : null;
};

export const updateGame = async ({
  redis,
  gameState,
}: {
  redis: Context['redis'] | RedisClient;
  gameState: GameState;
}): Promise<void> => {
  await redis.setEx(getGameKey(gameState.id), GAME_EXPIRY, JSON.stringify(gameState));
};

export const joinGame = async ({
  redis,
  postId,
  playerId,
  username,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  playerId: string;
  username: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  if (gameState.phase !== 'waiting') {
    return null; // Can't join game in progress
  }

  if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
    return null; // Game full
  }

  if (gameState.players[playerId]) {
    return gameState; // Already in game
  }

  const player: Player = {
    id: playerId,
    username,
    role: 'crewmate',
    status: 'alive',
    position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
    tasksCompleted: 0,
    totalTasks: 3,
    hasVoted: false,
  };

  gameState.players[playerId] = player;
  await updateGame({ redis, gameState });
  return gameState;
};

export const startGame = async ({
  redis,
  postId,
  playerId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  playerId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  if (gameState.host !== playerId) return null; // Only host can start
  if (gameState.phase !== 'waiting') return null; // Already started

  const playerCount = Object.keys(gameState.players).length;
  if (playerCount < MIN_PLAYERS) return null; // Not enough players

  // Assign roles
  const playerIds = Object.keys(gameState.players);
  const impostorCount = Math.max(1, Math.floor(playerCount / 4));
  const impostorIds = playerIds.sort(() => Math.random() - 0.5).slice(0, impostorCount);

  Object.values(gameState.players).forEach((player) => {
    player.role = impostorIds.includes(player.id) ? 'impostor' : 'crewmate';
    player.hasVoted = false;
    player.votedFor = undefined;
  });

  gameState.phase = 'playing';
  gameState.gameStartTime = Date.now();
  await updateGame({ redis, gameState });
  return gameState;
};

export const completeTask = async ({
  redis,
  postId,
  playerId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  playerId: string;
}): Promise<{ gameState: GameState | null; taskCompleted: boolean }> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return { gameState: null, taskCompleted: false };

  const player = gameState.players[playerId];
  if (!player || player.status !== 'alive' || player.role !== 'crewmate') {
    return { gameState, taskCompleted: false };
  }

  if (player.tasksCompleted < player.totalTasks) {
    player.tasksCompleted++;
  }

  // Check for crewmate victory
  const crewmates = Object.values(gameState.players).filter(p => p.role === 'crewmate' && p.status === 'alive');
  const totalTasks = crewmates.reduce((sum, p) => sum + p.totalTasks, 0);
  const completedTasks = crewmates.reduce((sum, p) => sum + p.tasksCompleted, 0);

  if (completedTasks >= totalTasks) {
    gameState.phase = 'ended';
    gameState.winner = 'crewmates';
  }

  await updateGame({ redis, gameState });
  return { gameState, taskCompleted: true };
};

export const callEmergencyMeeting = async ({
  redis,
  postId,
  playerId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  playerId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  const player = gameState.players[playerId];
  if (!player || player.status !== 'alive' || gameState.phase !== 'playing') {
    return null;
  }

  gameState.phase = 'discussion';
  gameState.discussionTimeLeft = DISCUSSION_TIME;
  gameState.meetingCaller = playerId;

  // Reset votes
  Object.values(gameState.players).forEach(p => {
    p.hasVoted = false;
    p.votedFor = undefined;
  });

  await updateGame({ redis, gameState });
  return gameState;
};

export const eliminatePlayer = async ({
  redis,
  postId,
  targetId,
  impostorId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  targetId: string;
  impostorId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  const impostor = gameState.players[impostorId];
  const target = gameState.players[targetId];

  if (!impostor || !target || impostor.role !== 'impostor' || impostor.status !== 'alive' || target.status !== 'alive') {
    return null;
  }

  target.status = 'dead';
  gameState.eliminatedPlayer = targetId;

  // Check win conditions
  const alivePlayers = Object.values(gameState.players).filter(p => p.status === 'alive');
  const aliveImpostors = alivePlayers.filter(p => p.role === 'impostor');
  const aliveCrewmates = alivePlayers.filter(p => p.role === 'crewmate');

  if (aliveImpostors.length >= aliveCrewmates.length) {
    gameState.phase = 'ended';
    gameState.winner = 'impostors';
  } else {
    // Start emergency meeting for body discovery
    gameState.phase = 'discussion';
    gameState.discussionTimeLeft = DISCUSSION_TIME;
    gameState.meetingCaller = impostorId;
  }

  await updateGame({ redis, gameState });
  return gameState;
};

export const castVote = async ({
  redis,
  postId,
  voterId,
  targetId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
  voterId: string;
  targetId?: string; // undefined means skip vote
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  const voter = gameState.players[voterId];
  if (!voter || voter.status !== 'alive' || gameState.phase !== 'voting') {
    return null;
  }

  voter.hasVoted = true;
  voter.votedFor = targetId;

  // Check if all alive players have voted
  const alivePlayers = Object.values(gameState.players).filter(p => p.status === 'alive');
  const votedPlayers = alivePlayers.filter(p => p.hasVoted);

  if (votedPlayers.length === alivePlayers.length) {
    // Count votes
    const votes: Record<string, number> = {};
    let skipCount = 0;

    alivePlayers.forEach(player => {
      if (player.votedFor) {
        votes[player.votedFor] = (votes[player.votedFor] || 0) + 1;
      } else {
        skipCount++;
      }
    });

    // Find player with most votes
    let mostVoted = '';
    let maxVotes = 0;
    let tie = false;

    Object.entries(votes).forEach(([playerId, voteCount]) => {
      if (voteCount > maxVotes) {
        mostVoted = playerId;
        maxVotes = voteCount;
        tie = false;
      } else if (voteCount === maxVotes && maxVotes > 0) {
        tie = true;
      }
    });

    // Eliminate player if they have majority and no tie
    if (mostVoted && !tie && maxVotes > skipCount) {
      const eliminatedPlayer = gameState.players[mostVoted];
      if (eliminatedPlayer) {
        eliminatedPlayer.status = 'dead';
        gameState.eliminatedPlayer = mostVoted;
      }
    }

    // Check win conditions
    const remainingAlivePlayers = Object.values(gameState.players).filter(p => p.status === 'alive');
    const remainingImpostors = remainingAlivePlayers.filter(p => p.role === 'impostor');
    const remainingCrewmates = remainingAlivePlayers.filter(p => p.role === 'crewmate');

    if (remainingImpostors.length === 0) {
      gameState.phase = 'ended';
      gameState.winner = 'crewmates';
    } else if (remainingImpostors.length >= remainingCrewmates.length) {
      gameState.phase = 'ended';
      gameState.winner = 'impostors';
    } else {
      gameState.phase = 'playing';
    }

    // Reset votes
    Object.values(gameState.players).forEach(p => {
      p.hasVoted = false;
      p.votedFor = undefined;
    });
  }

  await updateGame({ redis, gameState });
  return gameState;
};

export const updateGamePhase = async ({
  redis,
  postId,
}: {
  redis: Context['redis'] | RedisClient;
  postId: string;
}): Promise<GameState | null> => {
  const gameState = await getGame({ redis, postId });
  if (!gameState) return null;

  if (gameState.phase === 'discussion' && gameState.discussionTimeLeft !== undefined) {
    gameState.discussionTimeLeft = Math.max(0, gameState.discussionTimeLeft - 1);
    if (gameState.discussionTimeLeft === 0) {
      gameState.phase = 'voting';
      gameState.votingTimeLeft = VOTING_TIME;
    }
  } else if (gameState.phase === 'voting' && gameState.votingTimeLeft !== undefined) {
    gameState.votingTimeLeft = Math.max(0, gameState.votingTimeLeft - 1);
    if (gameState.votingTimeLeft === 0) {
      // Auto-skip votes for players who haven't voted
      gameState.phase = 'playing';
      Object.values(gameState.players).forEach(p => {
        p.hasVoted = false;
        p.votedFor = undefined;
      });
    }
  }

  await updateGame({ redis, gameState });
  return gameState;
};