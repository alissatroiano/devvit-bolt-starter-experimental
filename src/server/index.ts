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
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
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

const router = express.Router();

// Health check endpoint
router.get('/api/health', (req, res) => {
  try {
    const context = getContext();
    console.log('Health check - Context:', context);
    
    res.json({ 
      status: 'success', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      context: context ? {
        hasPostId: !!context.postId,
        hasUserId: !!context.userId,
        hasReddit: !!context.reddit,
        hasRedis: !!context.redis
      } : null
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to safely get context with better error handling
function getSafeContext() {
  try {
    const context = getContext();
    console.log('Context retrieved:', {
      hasContext: !!context,
      postId: context?.postId,
      userId: context?.userId,
      hasReddit: !!context?.reddit,
      hasRedis: !!context?.redis
    });
    return context;
  } catch (error) {
    console.error('Error getting context:', error);
    return null;
  }
}

// Join or create game
router.post<any, JoinGameResponse, { username: string }>(
  '/api/join',
  async (req, res): Promise<void> => {
    try {
      console.log('=== JOIN GAME REQUEST ===');
      console.log('Request body:', req.body);
      
      const { username } = req.body;
      
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        console.log('Invalid username provided');
        res.status(400).json({ status: 'error', message: 'Valid username is required' });
        return;
      }

      const context = getSafeContext();
      
      if (!context) {
        console.error('No context available - this might be a development environment');
        // In development, create a mock context
        const mockPostId = 'dev_post_' + Date.now();
        const mockUserId = 'dev_user_' + Math.random().toString(36).substr(2, 9);
        
        console.log('Using mock context:', { postId: mockPostId, userId: mockUserId });
        
        try {
          const redis = getRedis();
          let gameState = await getGame({ redis, postId: mockPostId });
          
          if (!gameState) {
            console.log('Creating new game with mock context');
            gameState = await createGame({
              redis,
              postId: mockPostId,
              hostId: mockUserId,
              hostUsername: username.trim(),
            });
          } else {
            console.log('Joining existing game with mock context');
            const joinResult = await joinGame({
              redis,
              postId: mockPostId,
              playerId: mockUserId,
              username: username.trim(),
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

          console.log('Game state created/joined successfully (mock context)');
          res.json({
            status: 'success',
            gameState,
            playerId: mockUserId,
          });
          return;
        } catch (redisError) {
          console.error('Redis error with mock context:', redisError);
          res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed' 
          });
          return;
        }
      }
      
      const { postId, userId } = context;
      console.log('Real context:', { postId, userId });
      
      if (!postId) {
        console.error('No postId in context');
        res.status(400).json({ status: 'error', message: 'postId is required' });
        return;
      }
      if (!userId) {
        console.error('No userId in context');
        res.status(400).json({ status: 'error', message: 'Must be logged in' });
        return;
      }

      const redis = getRedis();
      let gameState = await getGame({ redis, postId });
      
      if (!gameState) {
        console.log('Creating new game');
        gameState = await createGame({
          redis,
          postId,
          hostId: userId,
          hostUsername: username.trim(),
        });
      } else {
        console.log('Joining existing game');
        const joinResult = await joinGame({
          redis,
          postId,
          playerId: userId,
          username: username.trim(),
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
      console.error('Error in join endpoint:', error);
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
    console.log('=== GAME STATE REQUEST ===');
    
    const context = getSafeContext();
    
    if (!context) {
      console.log('No context for game state - using development fallback');
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }
    
    const { postId } = context;

    if (!postId) {
      console.error('No postId in context for game state');
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    const redis = getRedis();
    const gameState = await getGame({ redis, postId });
    
    if (!gameState) {
      console.log('No game state found for postId:', postId);
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    console.log('Game state retrieved successfully');
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
    console.log('=== START GAME REQUEST ===');
    
    const context = getSafeContext();
    
    if (!context) {
      console.error('No context for start game');
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

    console.log('Game started successfully');
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
      console.log('=== FIND IMPOSTOR REQUEST ===');
      console.log('Request body:', req.body);
      
      const { x, y } = req.body;
      
      if (typeof x !== 'number' || typeof y !== 'number') {
        res.status(400).json({ status: 'error', message: 'Valid x and y coordinates required' });
        return;
      }
      
      const context = getSafeContext();
      
      if (!context) {
        console.error('No context for find impostor');
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
      const result = await findImpostor({ redis, postId, playerId: userId, x, y });
      
      if (!result.gameState) {
        res.status(404).json({ status: 'error', message: 'Game not found' });
        return;
      }

      console.log('Find impostor completed:', { found: result.found, score: result.score });
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
    const context = getSafeContext();
    
    if (!context) {
      // Silently fail for timer updates when no context
      res.status(404).json({ status: 'error', message: 'Game not found' });
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

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  
  // Send proper JSON error response
  res.status(500).json({ 
    status: 'error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

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
  
  // Test context on startup
  try {
    const context = getSafeContext();
    console.log('Startup context check:', context ? 'Available' : 'Not available');
  } catch (error) {
    console.log('Startup context check failed:', error);
  }
});