import React, { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameResults } from './components/GameResults';
import { GameState, Player, Impostor } from '../shared/types/game';
import packageJson from '../../package.json';

const Banner = () => {
  const subreddit = extractSubredditName();
  if (!subreddit) {
    return (
      <div className="w-full bg-red-600 text-white p-4 text-center mb-4">
        Please visit your playtest subreddit to play the game with network functionality.
      </div>
    );
  }

  const subredditUrl = `https://www.reddit.com/r/${subreddit}`;

  return (
    <div className="w-full bg-red-600 text-white p-4 text-center mb-4">
      Please visit{' '}
      <a
        href={subredditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-bold"
      >
        r/{subreddit}
      </a>{' '}
      to play the game with network functionality. Remember to create a post from the three dots
      (beside the mod tools button).
    </div>
  );
};

function extractSubredditName(): string | null {
  const devCommand = packageJson.scripts?.['dev:devvit'];

  if (!devCommand || !devCommand.includes('devvit playtest')) {
    console.warn('"dev:devvit" script is missing or malformed.');
    return null;
  }

  const argsMatch = devCommand.match(/devvit\s+playtest\s+(.*)/);
  if (!argsMatch || !argsMatch[1]) {
    console.warn('Could not parse arguments in dev:devvit script.');
    return null;
  }

  const args = argsMatch[1].trim().split(/\s+/);
  const subreddit = args.find((arg) => !arg.startsWith('-'));

  if (!subreddit) {
    console.warn('No subreddit name found in dev:devvit command.');
    return null;
  }

  return subreddit;
}

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showBanner, setShowBanner] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [serverHealth, setServerHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    const hostname = window.location.hostname;
    setShowBanner(!hostname.endsWith('devvit.net'));
  }, []);

  // Enhanced server health check with better retry logic
  const checkServerHealth = useCallback(async (attempt = 1): Promise<boolean> => {
    try {
      console.log(`🔍 Health check attempt ${attempt}`);
      setConnectionAttempts(prev => prev + 1);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Server health check result:', result);
        setServerHealth('healthy');
        setRetryCount(0);
        setConnectionAttempts(0);
        return true;
      } else {
        console.error('❌ Health check failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setServerHealth('unhealthy');
        return false;
      }
    } catch (err) {
      console.error(`❌ Server health check failed (attempt ${attempt}):`, err);
      setServerHealth('unhealthy');
      
      // Retry up to 5 times with exponential backoff
      if (attempt < 5) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Max 10s delay
        console.log(`⏳ Retrying health check in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return checkServerHealth(attempt + 1);
      }
      
      return false;
    }
  }, []);

  const fetchGameState = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch('/api/game-state', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Don't throw error for 404s during polling
        if (response.status === 404) return;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setError('');
      } else if (result.message !== 'Game not found') {
        setError(result.message || 'Error fetching game state');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏰ Game state fetch timed out');
        return;
      }
      console.error('❌ Error fetching game state:', err);
      // Don't set error for network issues during polling
    }
  }, []);

  const joinGame = useCallback(async (username: string) => {
    setLoading(true);
    setError('');
    
    try {
      // First check server health
      console.log('🔍 Checking server health before joining...');
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        setError('Server is not responding. Please try again in a moment.');
        setLoading(false);
        return;
      }

      console.log('🎮 Attempting to join game with username:', username);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: username.trim() }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('📡 Join response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Join request failed:', errorText);
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `Server error (${response.status})`);
        } catch {
          throw new Error(`Server error (${response.status}). Please try again.`);
        }
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ Non-JSON response:', responseText);
        throw new Error('Server returned invalid response');
      }
      
      const result = await response.json();
      console.log('✅ Join result:', result);
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setCurrentPlayer(result.gameState.players[result.playerId]);
        setError('');
        setGameStarted(true);
        
        // Auto-start the game if we're the host
        if (result.gameState.host === result.playerId && result.gameState.phase === 'waiting') {
          console.log('👑 Auto-starting game as host...');
          setTimeout(async () => {
            try {
              const startResponse = await fetch('/api/start-game', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
              });
              
              if (startResponse.ok) {
                const startResult = await startResponse.json();
                
                if (startResult.status === 'success') {
                  setGameState(startResult.gameState);
                  console.log('🚀 Game auto-started successfully');
                }
              }
            } catch (err) {
              console.error('❌ Error auto-starting game:', err);
            }
          }, 500);
        }
      } else {
        setError(result.message || 'Error joining game');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Connection timed out. Please try again.');
      } else {
        console.error('❌ Error joining game:', err);
        setError(`Connection error: ${err instanceof Error ? err.message : 'Please try again'}`);
      }
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [checkServerHealth]);

  const findImpostor = useCallback(async (x: number, y: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch('/api/find-impostor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ x, y }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setError('');
        return {
          found: result.found,
          impostor: result.impostor,
          score: result.score,
        };
      } else {
        setError(result.message || 'Error finding impostor');
        return { found: false, score: 0 };
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏰ Find impostor request timed out');
        return { found: false, score: 0 };
      }
      console.error('❌ Error finding impostor:', err);
      setError('Network error');
      return { found: false, score: 0 };
    }
  }, []);

  // Update current player when game state changes
  useEffect(() => {
    if (gameState && currentPlayer) {
      const updatedPlayer = gameState.players[currentPlayer.id];
      if (updatedPlayer) {
        setCurrentPlayer(updatedPlayer);
      }
    }
  }, [gameState, currentPlayer]);

  // Poll for game state updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState && gameStarted && serverHealth === 'healthy') {
      interval = setInterval(fetchGameState, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, gameStarted, serverHealth, fetchGameState]);

  // Update game timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState && gameState.phase === 'playing' && serverHealth === 'healthy') {
      interval = setInterval(async () => {
        try {
          await fetch('/api/update-timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('❌ Error updating timer:', err);
        }
      }, 1000); // Update every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, serverHealth]);

  // Check for existing game and server health on load
  useEffect(() => {
    const init = async () => {
      console.log('🚀 Initializing game...');
      const isHealthy = await checkServerHealth();
      if (isHealthy) {
        await fetchGameState();
      }
      setLoading(false);
    };
    init();
  }, [fetchGameState, checkServerHealth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading game...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd700] mx-auto"></div>
          {serverHealth === 'unhealthy' && (
            <div className="mt-4 text-red-400 text-sm">
              Server connection issues detected... (Attempt {connectionAttempts})
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show start screen if no game has been started
  if (!gameStarted && !gameState) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white">
        {showBanner && <Banner />}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-[#16213e] rounded-lg p-8 shadow-2xl border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#ff4444] mb-2">REDDIMPOSTERS</h1>
              <p className="text-[#ffd700] font-medium">Find the Alien Impostors</p>
              {serverHealth === 'healthy' && (
                <div className="mt-2 text-xs text-green-400">🟢 Server Online</div>
              )}
              {serverHealth === 'unhealthy' && (
                <div className="mt-2 text-xs text-red-400">🔴 Server Issues (Attempts: {connectionAttempts})</div>
              )}
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">🎯 Objective</h3>
                <p className="text-sm text-gray-300">Find all 12 alien impostors hidden in the crowd before time runs out!</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">⏱️ Time Limit</h3>
                <p className="text-sm text-gray-300">You have 5 minutes to find as many impostors as possible.</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">🏆 Scoring</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>Easy (large): +10 points</div>
                  <div>Medium (small): +25 points</div>
                  <div>Hard (tiny): +50 points</div>
                  <div>+ Speed bonus for quick finds!</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                const randomUsername = `Player${Math.floor(Math.random() * 10000)}`;
                joinGame(randomUsername);
              }}
              disabled={serverHealth === 'unhealthy' || loading}
              className="w-full py-3 px-4 bg-[#ffd700] hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-black"
            >
              {serverHealth === 'unhealthy' ? '⚠️ SERVER OFFLINE' : loading ? '🔄 CONNECTING...' : '🚀 START HUNTING'}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
                {error}
                {retryCount > 0 && (
                  <div className="mt-2 text-xs">
                    Retry attempt: {retryCount}
                  </div>
                )}
              </div>
            )}
            
            {serverHealth === 'unhealthy' && (
              <div className="mt-4 p-3 bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-lg text-yellow-300 text-sm">
                <div className="flex items-center justify-between">
                  <span>Server connection issues. Please try again.</span>
                  <button 
                    onClick={() => checkServerHealth()}
                    className="ml-2 px-2 py-1 bg-yellow-600 text-black rounded text-xs hover:bg-yellow-500"
                    disabled={loading}
                  >
                    {loading ? '...' : 'Retry'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderGameContent = () => {
    if (!gameState) {
      return (
        <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-xl mb-4">Failed to load game</div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#ffd700] text-black px-4 py-2 rounded hover:bg-yellow-500"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    switch (gameState.phase) {
      case 'waiting':
        // Show a brief waiting message then auto-start
        return (
          <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
            <div className="text-center">
              <div className="text-white text-xl mb-4">Preparing game...</div>
              <div className="animate-pulse text-gray-400">Starting in a moment...</div>
            </div>
          </div>
        );
      
      case 'playing':
        return (
          <GameBoard
            gameState={gameState}
            currentPlayer={currentPlayer}
            onFindImpostor={findImpostor}
            error={error}
          />
        );
      
      case 'ended':
        return (
          <GameResults
            gameState={gameState}
            currentPlayer={currentPlayer}
            onPlayAgain={() => window.location.reload()}
          />
        );
      
      default:
        return <div className="text-white">Unknown game state</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {showBanner && <Banner />}
      {renderGameContent()}
    </div>
  );
};