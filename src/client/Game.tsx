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

  useEffect(() => {
    const hostname = window.location.hostname;
    setShowBanner(!hostname.endsWith('devvit.net'));
  }, []);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game-state');
      
      if (!response.ok) {
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
      console.error('Error fetching game state:', err);
      // Don't set error for network issues during polling
    }
  }, []);

  const joinGame = useCallback(async (username: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setCurrentPlayer(result.gameState.players[result.playerId]);
        setError('');
        setGameStarted(true);
        
        // Auto-start the game if we're the host
        if (result.gameState.host === result.playerId && result.gameState.phase === 'waiting') {
          setTimeout(async () => {
            try {
              const startResponse = await fetch('/api/start-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              
              if (startResponse.ok) {
                const startResult = await startResponse.json();
                
                if (startResult.status === 'success') {
                  setGameState(startResult.gameState);
                }
              }
            } catch (err) {
              console.error('Error auto-starting game:', err);
            }
          }, 500);
        }
      } else {
        setError(result.message || 'Error joining game');
      }
    } catch (err) {
      console.error('Error joining game:', err);
      setError('Network error - please check your connection');
    } finally {
      setLoading(false);
    }
  }, []);

  const findImpostor = useCallback(async (x: number, y: number) => {
    try {
      const response = await fetch('/api/find-impostor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
      
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
      console.error('Error finding impostor:', err);
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
    
    if (gameState && gameStarted) {
      interval = setInterval(fetchGameState, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, gameStarted, fetchGameState]);

  // Update game timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState && gameState.phase === 'playing') {
      interval = setInterval(async () => {
        try {
          await fetch('/api/update-timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('Error updating timer:', err);
        }
      }, 1000); // Update every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState]);

  // Check for existing game on load
  useEffect(() => {
    const init = async () => {
      await fetchGameState();
      setLoading(false);
    };
    init();
  }, [fetchGameState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading game...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ea5e9] mx-auto"></div>
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
              <h1 className="text-3xl font-bold text-[#0ea5e9] mb-2">FIND THE IMPOSTORS</h1>
              <p className="text-gray-300">Hidden Object Challenge</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#0ea5e9] font-bold mb-2">🎯 Objective</h3>
                <p className="text-sm text-gray-300">Find all 12 alien impostors hidden in the crowd before time runs out!</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#0ea5e9] font-bold mb-2">⏱️ Time Limit</h3>
                <p className="text-sm text-gray-300">You have 5 minutes to find as many impostors as possible.</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#0ea5e9] font-bold mb-2">🏆 Scoring</h3>
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
              className="w-full py-3 px-4 bg-[#0ea5e9] hover:bg-blue-600 rounded-lg font-semibold transition-colors text-white"
            >
              🚀 START HUNTING
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
                {error}
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
              className="bg-[#0ea5e9] text-white px-4 py-2 rounded hover:bg-blue-600"
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