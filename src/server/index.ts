import express from 'express';
import { createServer, getContext, getServerPort } from '@devvit/server';
import {
  JoinGameResponse,
  GameStateResponse,
  StartGameResponse,
  FindImpostorResponse,
} from '../shared/types/game';
import {
  createGame,
  getGame,
  joinGame,
  startGame,
  findImpostor,
  updateGameTimer,
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
            message: 'Cannot join game (full or other issue)' 
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

// Find impostor
router.post<any, FindImpostorResponse, { x: number; y: number }>(
  '/api/find-impostor',
  async (req, res): Promise<void> => {
    const { x, y } = req.body;
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
    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ status: 'error', message: 'Valid x and y coordinates required' });
      return;
    }

    try {
      const result = await findImpostor({ redis, postId, playerId: userId, x, y });
      
      if (!result.gameState) {
        res.status(404).json({ status: 'error', message: 'Game not found' });
        return;
      }

      res.json({
        status: 'success',
        gameState: result.gameState,
        found: result.found,
        impostor: result.impostor,
        score: result.score,
      });
    } catch (error) {
      console.error('Error finding impostor:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
);

// Update game timer
router.post<any, GameStateResponse>('/api/update-timer', async (req, res): Promise<void> => {
  const { postId } = getContext();
  const redis = getRedis();

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const gameState = await updateGameTimer({ redis, postId });
    
    if (!gameState) {
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('Error updating timer:', error);
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