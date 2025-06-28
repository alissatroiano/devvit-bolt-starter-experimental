import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameResults } from './components/GameResults';
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

interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  emoji: string;
  found: boolean;
}

interface GameState {
  phase: 'start' | 'playing' | 'ended';
  timeLeft: number;
  score: number;
  foundImpostors: string[];
  startTime?: number;
  endTime?: number;
}

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'start',
    timeLeft: 300, // 5 minutes
    score: 0,
    foundImpostors: []
  });
  
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Predefined impostor locations using emojis
  const impostors: Impostor[] = [
    {
      id: 'impostor1',
      x: 15,
      y: 25,
      width: 60,
      height: 80,
      emoji: '👽',
      found: false
    },
    {
      id: 'impostor2', 
      x: 65,
      y: 45,
      width: 50,
      height: 70,
      emoji: '🛸',
      found: false
    },
    {
      id: 'impostor3',
      x: 35,
      y: 70,
      width: 45,
      height: 65,
      emoji: '👾',
      found: false
    }
  ];

  useEffect(() => {
    const hostname = window.location.hostname;
    setShowBanner(!hostname.endsWith('devvit.net'));
  }, []);

  // Game timer
  useEffect(() => {
    if (gameState.phase === 'playing') {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            // Game over - time's up
            return {
              ...prev,
              phase: 'ended',
              timeLeft: 0,
              endTime: Date.now()
            };
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState.phase]);

  const startGame = useCallback(() => {
    setGameState({
      phase: 'playing',
      timeLeft: 300,
      score: 0,
      foundImpostors: [],
      startTime: Date.now()
    });
  }, []);

  const findImpostor = useCallback((x: number, y: number) => {
    if (gameState.phase !== 'playing') return { found: false, score: 0 };

    // Check if click is within any impostor's bounds
    const foundImpostor = impostors.find(impostor => {
      if (gameState.foundImpostors.includes(impostor.id)) return false;
      
      const withinX = x >= impostor.x && x <= impostor.x + impostor.width;
      const withinY = y >= impostor.y && y <= impostor.y + impostor.height;
      
      return withinX && withinY;
    });

    if (foundImpostor) {
      const points = 100; // Base points for finding an impostor
      const timeBonus = Math.floor(gameState.timeLeft / 10); // Bonus for time remaining
      const totalPoints = points + timeBonus;

      setGameState(prev => {
        const newFoundImpostors = [...prev.foundImpostors, foundImpostor.id];
        const newScore = prev.score + totalPoints;
        
        // Check if all impostors found
        if (newFoundImpostors.length === impostors.length) {
          // Game won!
          const finalScore = newScore + (prev.timeLeft * 2); // Big bonus for completing
          
          // Save to localStorage for Devvit preview
          const gameResult = {
            score: finalScore,
            timeUsed: 300 - prev.timeLeft,
            impostorsFound: newFoundImpostors.length,
            totalImpostors: impostors.length,
            completedAt: Date.now()
          };
          localStorage.setItem('reddimposters_result', JSON.stringify(gameResult));
          
          return {
            ...prev,
            phase: 'ended',
            score: finalScore,
            foundImpostors: newFoundImpostors,
            endTime: Date.now()
          };
        }
        
        return {
          ...prev,
          score: newScore,
          foundImpostors: newFoundImpostors
        };
      });

      return { found: true, impostor: foundImpostor, score: totalPoints };
    }

    return { found: false, score: 0 };
  }, [gameState.phase, gameState.foundImpostors, gameState.timeLeft]);

  const playAgain = useCallback(() => {
    setGameState({
      phase: 'start',
      timeLeft: 300,
      score: 0,
      foundImpostors: []
    });
  }, []);

  if (gameState.phase === 'start') {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white">
        {showBanner && <Banner />}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-[#16213e] rounded-lg p-8 shadow-2xl border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#ff4444] mb-2">REDDIMPOSTERS</h1>
              <p className="text-[#ffd700] font-medium">Find the Alien Impostors</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">🎯 Objective</h3>
                <p className="text-sm text-gray-300">Find all 3 alien impostors (👽 🛸 👾) hidden in the crowd before time runs out!</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">⏱️ Time Limit</h3>
                <p className="text-sm text-gray-300">You have 5 minutes to find all the impostors.</p>
              </div>
              
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-600">
                <h3 className="text-[#ffd700] font-bold mb-2">🏆 Scoring</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>Base: +100 points per impostor</div>
                  <div>Time bonus: +10 points per 10 seconds left</div>
                  <div>Completion bonus: +2 points per second remaining</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-3 px-4 bg-[#ffd700] hover:bg-yellow-500 rounded-lg font-semibold transition-colors text-black"
            >
              🚀 START HUNTING
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'playing') {
    return (
      <GameBoard
        gameState={gameState}
        impostors={impostors}
        onFindImpostor={findImpostor}
      />
    );
  }

  if (gameState.phase === 'ended') {
    return (
      <GameResults
        gameState={gameState}
        impostors={impostors}
        onPlayAgain={playAgain}
      />
    );
  }

  return null;
};