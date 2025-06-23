import React, { useState, useEffect, useCallback } from 'react';
import { GameLobby } from './components/GameLobby';
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
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setCurrentPlayer(result.gameState.players[result.playerId]);
        setError('');
      } else {
        setError(result.message || 'Error joining game');
      }
    } catch (err) {
      console.error('Error joining game:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = useCallback(async () => {
    try {
      const response = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setGameState(result.gameState);
        setError('');
      } else {
        setError(result.message || 'Error starting game');
      }
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Network error');
    }
  }, []);

  const findImpostor = useCallback(async (x: number, y: number) => {
    try {
      const response = await fetch('/api/find-impostor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
      
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

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchGameState();
      setLoading(false);
    };
    init();
  }, [fetchGameState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const renderGameContent = () => {
    if (!gameState) {
      return (
        <GameLobby
          onJoinGame={joinGame}
          error={error}
        />
      );
    }

    switch (gameState.phase) {
      case 'waiting':
        return (
          <GameLobby
            gameState={gameState}
            currentPlayer={currentPlayer}
            onJoinGame={joinGame}
            onStartGame={startGame}
            error={error}
          />
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
    <div className="min-h-screen bg-gray-900 text-white">
      {showBanner && <Banner />}
      {renderGameContent()}
    </div>
  );
};