import express from 'express';
import { createServer, getServerPort } from '@devvit/server';
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
app.use((req, _res, next) => {
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

// Development mode detection - more robust
const isDevelopment = () => {
  try {
    // Try to import getContext dynamically
    const { getContext } = require('@devvit/server');
    const context = getContext();
    return !context || !context.postId || !context.userId;
  } catch {
    return true; // If getContext fails, assume development
  }
};

// Mock Redis for development
class MockRedis {
  private storage = new Map<string, string>();
  
  async get(key: string): Promise<string | null> {
    const value = this.storage.get(key);
    console.log(`MockRedis GET ${key}: ${value ? 'found' : 'not found'}`);
    return value || null;
  }
  
  async set(key: string, value: string, _options?: { expiration?: Date }): Promise<void> {
    console.log(`MockRedis SET ${key}: ${value.length} chars`);
    this.storage.set(key, value);
  }
}

const mockRedis = new MockRedis();

// Health check endpoint
router.get('/api/health', (_req, res) => {
  try {
    const devMode = isDevelopment();
    let contextInfo = null;
    
    if (!devMode) {
      try {
        const { getContext } = require('@devvit/server');
        const context = getContext();
        contextInfo = {
          hasPostId: !!context?.postId,
          hasUserId: !!context?.userId,
          hasReddit: !!context?.reddit,
          hasRedis: !!context?.redis
        };
      } catch (err) {
        contextInfo = { error: err instanceof Error ? err.message : 'Unknown error' };
      }
    }
    
    res.json({ 
      status: 'success', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      development: devMode,
      context: contextInfo
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

// Helper function to safely get context with development fallback
function getSafeContext() {
  const devMode = isDevelopment();
  
  if (devMode) {
    console.log('🔧 Running in development mode - using mock context');
    return {
      postId: 'dev_post_123',
      userId: `dev_user_${Math.floor(Math.random() * 1000)}`,
      redis: mockRedis,
      reddit: null,
      ui: null,
      isDevelopment: true
    };
  }
  
  try {
    const { getContext } = require('@devvit/server');
    const context = getContext();
    if (!context) {
      throw new Error('Context is null');
    }
    
    console.log('🌐 Production context retrieved:', {
      hasContext: !!context,
      postId: context.postId,
      userId: context.userId,
      hasReddit: !!context.reddit,
      hasRedis: !!context.redis
    });
    
    // Import Redis dynamically for production
    let redis;
    try {
      const { getRedis } = require('@devvit/redis');
      redis = getRedis();
    } catch (err) {
      console.error('Failed to get Redis:', err);
      redis = mockRedis; // Fallback to mock
    }
    
    return {
      ...context,
      redis,
      isDevelopment: false
    };
  } catch (error) {
    console.error('❌ Error getting context, falling back to development mode:', error);
    return {
      postId: 'fallback_post_123',
      userId: `fallback_user_${Math.floor(Math.random() * 1000)}`,
      redis: mockRedis,
      reddit: null,
      ui: null,
      isDevelopment: true
    };
  }
}

// Join or create game
router.post('/api/join', async (req, res): Promise<void> => {
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
    const { postId, userId, redis, isDevelopment: devMode } = context;
    
    console.log('📋 Using context:', { postId, userId, devMode });
    
    if (!postId || !userId) {
      console.error('❌ Missing postId or userId in context');
      res.status(500).json({ status: 'error', message: 'Server configuration error' });
      return;
    }

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
    });
  }
});

// Get current game state
router.get('/api/game-state', async (_req, res): Promise<void> => {
  try {
    console.log('=== GAME STATE REQUEST ===');
    
    const context = getSafeContext();
    const { postId, redis, isDevelopment: devMode } = context;
    
    console.log('📋 Game state context:', { postId, devMode });

    if (!postId) {
      console.log('❌ No postId for game state');
      res.status(404).json({ status: 'error', message: 'Game not found' });
      return;
    }

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
    });
  }
});

// Start game (host only)
router.post('/api/start-game', async (_req, res): Promise<void> => {
  try {
    console.log('=== START GAME REQUEST ===');
    
    const context = getSafeContext();
    const { postId, userId, redis, isDevelopment: devMode } = context;
    
    console.log('📋 Start game context:', { postId, userId, devMode });

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }

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
    });
  }
});

// Find impostor
router.post('/api/find-impostor', async (req, res): Promise<void> => {
  try {
    console.log('=== FIND IMPOSTOR REQUEST ===');
    console.log('Request body:', req.body);
    
    const { x, y } = req.body;
    
    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ status: 'error', message: 'Valid x and y coordinates required' });
      return;
    }
    
    const context = getSafeContext();
    const { postId, userId, redis, isDevelopment: devMode } = context;
    
    console.log('📋 Find impostor context:', { postId, userId, devMode });

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'Must be logged in' });
      return;
    }

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
    });
  }
});

// Update game timer
router.post('/api/update-timer', async (_req, res): Promise<void> => {
  try {
    const context = getSafeContext();
    const { postId, redis } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

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
    });
  }
});

app.use(router);

// Enhanced error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  console.log(`🔧 Development mode: ${isDevelopment()}`);
  
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