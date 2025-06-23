import express from 'express';
import { createServer, getContext, getServerPort } from '@devvit/server';
import {
  JoinGameResponse,
  GameStateResponse,
  ActionResponse,
  StartGameResponse,
  VoteResponse,
  CompleteTaskResponse,
} from '../shared/types/game';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
  completeTask,
  callEmergencyMeeting,
  eliminatePlayer,
  castVote,
  updateGamePhase,
} from './core/game';
import { getRedis } from '@devvit/redis';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Join or create game
router.post<any, JoinGameResponse, { username: string }>(
  '/api/join',
  async (req, res): Promise<void> => {
    const { username } = req.body;
    const { postId, userId } = getContext();
    const redis = getRedis();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }
    if (!username) {
      res.status(400).json({ status: 'error', message: 'Username is required' });
      return;
    }

    try {
      let gameState = await getGame({ redis, postId });
      
      if (!gameState) {
        // Create new game
        gameState = await createGame({
          redis,
          postId,
          hostId: userId,
          hostUsername: username,
        });
      } else {
        // Join existing game
        const joinResult = await joinGame({
          redis,
          postId,
          playerId: userId,
          username,
        });
        
        if (!joinResult) {
          res.status(400).json({ 
            status: 'error', 
            message: 'Cannot join game (full, in progress, or other issue)' 
          });
          return;
        }
        gameState = joinResult;
      }

      res.json({
        status: 'success',
        gameState,
        playerId: userId,
      });
    } catch (error) {
      console.error('Error joining game:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
);

// Get current game state
router.get<any, GameStateResponse>('/api/game-state', async (req, res): Promise<void> => {
  const { postId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const gameState = await getGame({ redis, postId });
    
    if (!gameState) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start game (host only)
router.post<any, StartGameResponse>('/api/start-game', async (req, res): Promise<void> => {
  const { postId, userId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }
  if (!userId) {
    res.status(400).json({ status: 'error', message: 'Must be logged in' });
    return;
  }

  try {
    const gameState = await startGame({ redis, postId, playerId: userId });
    
    if (!gameState) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot start game (not host, already started, or not enough players)' 
      });
      return;
    }

    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Complete task (crewmates only)
router.post<any, CompleteTaskResponse>('/api/complete-task', async (req, res): Promise<void> => {
  const { postId, userId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }
  if (!userId) {
    res.status(400).json({ status: 'error', message: 'Must be logged in' });
    return;
  }

  try {
    const result = await completeTask({ redis, postId, playerId: userId });
    
    if (!result.gameState) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    res.json({
      status: 'success',
      gameState: result.gameState,
      taskCompleted: result.taskCompleted,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Call emergency meeting
router.post<any, ActionResponse>('/api/emergency-meeting', async (req, res): Promise<void> => {
  const { postId, userId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }
  if (!userId) {
    res.status(400).json({ status: 'error', message: 'Must be logged in' });
    return;
  }

  try {
    const gameState = await callEmergencyMeeting({ redis, postId, playerId: userId });
    
    if (!gameState) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot call emergency meeting' 
      });
      return;
    }

    res.json({
      status: 'success',
      gameState,
      message: 'Emergency meeting called!',
    });
  } catch (error) {
    console.error('Error calling emergency meeting:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Eliminate player (impostors only)
router.post<any, ActionResponse, { targetId: string }>(
  '/api/eliminate',
  async (req, res): Promise<void> => {
    const { targetId } = req.body;
    const { postId, userId } = getContext();
    const redis = getRedis();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }
    if (!targetId) {
      res.status(400).json({ status: 'error', message: 'Target ID is required' });
      return;
    }

    try {
      const gameState = await eliminatePlayer({ 
        redis, 
        postId, 
        targetId, 
        impostorId: userId 
      });
      
      if (!gameState) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Cannot eliminate player' 
        });
        return;
      }

      res.json({
        status: 'success',
        gameState,
        message: 'Player eliminated!',
      });
    } catch (error) {
      console.error('Error eliminating player:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
);

// Cast vote
router.post<any, VoteResponse, { targetId?: string }>(
  '/api/vote',
  async (req, res): Promise<void> => {
    const { targetId } = req.body;
    const { postId, userId } = getContext();
    const redis = getRedis();

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }

    try {
      const gameState = await castVote({ 
        redis, 
        postId, 
        voterId: userId, 
        targetId 
      });
      
      if (!gameState) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Cannot cast vote' 
        });
        return;
      }

      res.json({
        status: 'success',
        gameState,
      });
    } catch (error) {
      console.error('Error casting vote:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
);

// Update game phase (for timer)
router.post<any, GameStateResponse>('/api/update-phase', async (req, res): Promise<void> => {
  const { postId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const gameState = await updateGamePhase({ redis, postId });
    
    if (!gameState) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('Error updating game phase:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));