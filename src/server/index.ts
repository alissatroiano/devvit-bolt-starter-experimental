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

const router = express.Router();

// Mock Redis for development and fallback
class MockRedis {
  private storage = new Map<string, string>();
  
  async get(key: string): Promise<string | null> {
    const value = this.storage.get(key);
    console.log(`MockRedis GET ${key}: ${value ? 'found' : 'not found'}`);
    return value || null;
  }
  
  async setEx(key: string, ttl: number, value: string): Promise<void> {
    console.log(`MockRedis SETEX ${key}: ${value.length} chars`);
    this.storage.set(key, value);
  }
  
  async set(key: string, value: string): Promise<void> {
    console.log(`MockRedis SET ${key}: ${value.length} chars`);
    this.storage.set(key, value);
  }
}

const mockRedis = new MockRedis();

// Enhanced context detection and fallback
function getSafeContext() {
  try {
    console.log('🔍 Attempting to get Devvit context...');
    const context = getContext();
    
    if (!context) {
      console.log('⚠️ No context available, using fallback');
      return createFallbackContext();
    }
    
    // Validate context has required properties
    if (!context.postId || !context.userId) {
      console.log('⚠️ Context missing required properties, using fallback');
      return createFallbackContext();
    }
    
    console.log('✅ Valid Devvit context found:', {
      postId: context.postId,
      userId: context.userId,
      hasReddit: !!context.reddit,
      hasRedis: !!context.redis
    });
    
    // Try to get Redis - fallback to mock if not available
    let redis;
    try {
      if (context.redis) {
        redis = context.redis;
        console.log('✅ Using Devvit Redis');
      } else {
        console.log('⚠️ No Redis in context, using mock');
        redis = mockRedis;
      }
    } catch (err) {
      console.log('⚠️ Redis error, using mock:', err);
      redis = mockRedis;
    }
    
    return {
      ...context,
      redis,
      isDevelopment: false
    };
  } catch (error) {
    console.log('❌ Context error, using fallback:', error);
    return createFallbackContext();
  }
}

function createFallbackContext() {
  const fallbackContext = {
    postId: `fallback_post_${Date.now()}`,
    userId: `fallback_user_${Math.floor(Math.random() * 10000)}`,
    redis: mockRedis,
    reddit: null,
    ui: null,
    isDevelopment: true
  };
  
  console.log('🔧 Created fallback context:', fallbackContext);
  return fallbackContext;
}

// Health check endpoint with comprehensive diagnostics
router.get('/api/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested');
    
    const context = getSafeContext();
    const diagnostics = {
      timestamp: new Date().toISOString(),
      server: 'running',
      context: {
        available: !!context,
        postId: context?.postId,
        userId: context?.userId,
        isDevelopment: context?.isDevelopment
      },
      redis: {
        available: !!context?.redis,
        type: context?.isDevelopment ? 'mock' : 'devvit'
      }
    };
    
    // Test Redis connection
    try {
      await context.redis.set('health_check', 'ok');
      const testValue = await context.redis.get('health_check');
      diagnostics.redis.working = testValue === 'ok';
    } catch (err) {
      diagnostics.redis.working = false;
      diagnostics.redis.error = err instanceof Error ? err.message : 'Unknown error';
    }
    
    console.log('✅ Health check completed:', diagnostics);
    
    res.json({ 
      status: 'success', 
      message: 'Server is running',
      diagnostics
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Join or create game
router.post<any, JoinGameResponse, { username: string }>(
  '/api/join',
  async (req, res): Promise<void> => {
    try {
      console.log('=== JOIN GAME REQUEST ===');
      console.log('Request body:', req.body);
      
      const { username } = req.body;
      
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        console.log('❌ Invalid username provided');
        res.status(400).json({ status: 'error', message: 'Valid username is required' });
        return;
      }

      const context = getSafeContext();
      const { postId, userId, redis, isDevelopment } = context;
      
      console.log('📋 Using context:', { postId, userId, isDevelopment });

      let gameState = await getGame({ redis, postId });
      
      if (!gameState) {
        console.log('🎮 Creating new game');
        gameState = await createGame({
          redis,
          postId,
          hostId: userId,
          hostUsername: username.trim(),
        });
      } else {
        console.log('🔗 Joining existing game');
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

      console.log('✅ Game state created/joined successfully');
      res.json({
        status: 'success',
        gameState,
        playerId: userId,
      });
    } catch (error) {
      console.error('❌ Error in join endpoint:', error);
      res.status(500).json({ 
        status: 'error', 
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const { postId, redis, isDevelopment } = context;
    
    console.log('📋 Game state context:', { postId, isDevelopment });

    const gameState = await getGame({ redis, postId });
    
    if (!gameState) {
      console.log('📭 No game state found for postId:', postId);
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

    console.log('✅ Game state retrieved successfully');
    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('❌ Error getting game state:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Start game (host only)
router.post<any, StartGameResponse>('/api/start-game', async (req, res): Promise<void> => {
  try {
    console.log('=== START GAME REQUEST ===');
    
    const context = getSafeContext();
    const { postId, userId, redis, isDevelopment } = context;
    
    console.log('📋 Start game context:', { postId, userId, isDevelopment });

    const gameState = await startGame({ redis, postId, playerId: userId });
    
    if (!gameState) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot start game (not host, already started, or not enough players)' 
      });
      return;
    }

    console.log('✅ Game started successfully');
    res.json({
      status: 'success',
      gameState,
    });
  } catch (error) {
    console.error('❌ Error starting game:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      const { postId, userId, redis, isDevelopment } = context;
      
      console.log('📋 Find impostor context:', { postId, userId, isDevelopment });

      const result = await findImpostor({ redis, postId, playerId: userId, x, y });
      
      if (!result.gameState) {
        res.status(404).json({ status: 'error', message: 'Game not found' });
        return;
      }

      console.log('✅ Find impostor completed:', { found: result.found, score: result.score });
      res.json({
        status: 'success',
        gameState: result.gameState,
        found: result.found,
        impostor: result.impostor,
        score: result.score,
      });
    } catch (error) {
      console.error('❌ Error finding impostor:', error);
      res.status(500).json({ 
        status: 'error', 
        message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update game timer
router.post<any, GameStateResponse>('/api/update-timer', async (req, res): Promise<void> => {
  try {
    const context = getSafeContext();
    const { postId, redis } = context;

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
    console.error('❌ Error updating timer:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

app.use(router);

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Unhandled server error:', err);
  
  // Send proper JSON error response
  res.status(500).json({ 
    status: 'error', 
    message: `Internal server error: ${err.message}`,
    timestamp: new Date().toISOString()
  });
});

// Catch-all error handler
app.use((req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.path}`);
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
  console.error(`💥 Server error: ${err.stack}`);
});

server.listen(port, () => {
  console.log(`🚀 Reddimposters server running on http://localhost:${port}`);
  console.log(`📊 Health check available at http://localhost:${port}/api/health`);
  
  // Test context on startup
  try {
    const context = getSafeContext();
    console.log('🔍 Startup context check:', context ? 'Available' : 'Not available');
    console.log('📋 Context details:', {
      postId: context?.postId,
      userId: context?.userId,
      isDev: context?.isDevelopment
    });
  } catch (error) {
    console.log('❌ Startup context check failed:', error);
  }
});