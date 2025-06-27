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

  const autoJoinGame = useCallback(async () => {
    setLoading(true);
    try {
      // Generate a random username
      const randomUsername = `Player${Math.floor(Math.random() * 10000)}`;
      
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: randomUsername }),
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
    
    if (gameState) {
      interval = setInterval(fetchGameState, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, fetchGameState]);

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

  // Auto-join game on initial load
  useEffect(() => {
    const init = async () => {
      await fetchGameState();
      if (!gameState) {
        await autoJoinGame();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

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