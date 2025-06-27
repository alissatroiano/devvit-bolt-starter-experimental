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

// Enhanced middleware for better error handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// CORS middleware for better compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  
  // Send proper JSON error response
  res.status(500).json({ 
    status: 'error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

const router = express.Router();

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Join or create game
router.post<any, JoinGameResponse, { username: string }>(
  '/api/join',
  async (req, res): Promise<void> => {
    try {
      console.log('Join game request:', req.body);
      
      const { username } = req.body;
      const context = getContext();
      
      if (!context) {
        console.error('No context available');
        res.status(500).json({ status: 'error', message: 'Server context not available' });
        return;
      }
      
      const { postId, userId } = context;
      console.log('Context:', { postId, userId });
      
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

      const redis = getRedis();
      let gameState = await getGame({ redis, postId });
      
      if (!gameState) {
        console.log('Creating new game');
        // Create new game
        gameState = await createGame({
          redis,
          postId,
          hostId: userId,
          hostUsername: username,
        });
      } else {
        console.log('Joining existing game');
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

      console.log('Game state created/joined successfully');
      res.json({
        status: 'success',
        gameState,
        playerId: userId,
      });
    } catch (error) {
      console.error('Error joining game:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get current game state
router.get<any, GameStateResponse>('/api/game-state', async (req, res): Promise<void> => {
  try {
    const context = getContext();
    
    if (!context) {
      res.status(500).json({ status: 'error', message: 'Server context not available' });
      return;
    }
    
    const { postId } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    const redis = getRedis();
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
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start game (host only)
router.post<any, StartGameResponse>('/api/start-game', async (req, res): Promise<void> => {
  try {
    const context = getContext();
    
    if (!context) {
      res.status(500).json({ status: 'error', message: 'Server context not available' });
      return;
    }
    
    const { postId, userId } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }

    const redis = getRedis();
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
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Find impostor
router.post<any, FindImpostorResponse, { x: number; y: number }>(
  '/api/find-impostor',
  async (req, res): Promise<void> => {
    try {
      const { x, y } = req.body;
      const context = getContext();
      
      if (!context) {
        res.status(500).json({ status: 'error', message: 'Server context not available' });
        return;
      }
      
      const { postId, userId } = context;

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

      const redis = getRedis();
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
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update game timer
router.post<any, GameStateResponse>('/api/update-timer', async (req, res): Promise<void> => {
  try {
    const context = getContext();
    
    if (!context) {
      res.status(500).json({ status: 'error', message: 'Server context not available' });
      return;
    }
    
    const { postId } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    const redis = getRedis();
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
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.use(router);

// Catch-all error handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    status: 'error', 
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

const port = getServerPort();
const server = createServer(app);

server.on('error', (err) => {
  console.error(`Server error: ${err.stack}`);
});

server.listen(port, () => {
  console.log(`🚀 Reddimposters server running on http://localhost:${port}`);
  console.log(`📊 Health check available at http://localhost:${port}/api/health`);
});