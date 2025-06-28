import React, { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameResults } from './components/GameResults';

interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  found: boolean;
}

interface GameState {
  phase: 'menu' | 'playing' | 'ended';
  timeLeft: number;
  score: number;
  impostors: Impostor[];
  startTime?: number;
  endTime?: number;
}

const GAME_TIME = 120; // 2 minutes
const IMPOSTORS: Omit<Impostor, 'found'>[] = [
  { id: '1', x: 15, y: 25, width: 40, height: 40 },
  { id: '2', x: 65, y: 45, width: 35, height: 35 },
  { id: '3', x: 40, y: 70, width: 30, height: 30 },
];

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'menu',
    timeLeft: GAME_TIME,
    score: 0,
    impostors: IMPOSTORS.map(imp => ({ ...imp, found: false })),
  });

  const startGame = () => {
    setGameState({
      phase: 'playing',
      timeLeft: GAME_TIME,
      score: 0,
      impostors: IMPOSTORS.map(imp => ({ ...imp, found: false })),
      startTime: Date.now(),
    });
  };

  const findImpostor = (clickX: number, clickY: number) => {
    if (gameState.phase !== 'playing') return;

    const foundImpostor = gameState.impostors.find(imp => {
      if (imp.found) return false;
      return clickX >= imp.x && clickX <= imp.x + imp.width &&
             clickY >= imp.y && clickY <= imp.y + imp.height;
    });

    if (foundImpostor) {
      const newImpostors = gameState.impostors.map(imp =>
        imp.id === foundImpostor.id ? { ...imp, found: true } : imp
      );
      
      const newScore = gameState.score + 100;
      const allFound = newImpostors.every(imp => imp.found);

      if (allFound) {
        const finalTime = Date.now();
        const timeBonus = Math.max(0, gameState.timeLeft * 10);
        const finalScore = newScore + timeBonus;
        
        // Save to localStorage
        const gameResult = {
          score: finalScore,
          time: GAME_TIME - gameState.timeLeft,
          completedAt: finalTime,
        };
        localStorage.setItem('lastGameResult', JSON.stringify(gameResult));

        setGameState(prev => ({
          ...prev,
          phase: 'ended',
          score: finalScore,
          impostors: newImpostors,
          endTime: finalTime,
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          score: newScore,
          impostors: newImpostors,
        }));
      }
    }
  };

  const playAgain = () => {
    setGameState({
      phase: 'menu',
      timeLeft: GAME_TIME,
      score: 0,
      impostors: IMPOSTORS.map(imp => ({ ...imp, found: false })),
    });
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState.phase === 'playing' && gameState.timeLeft > 0) {
      interval = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            // Time's up
            const gameResult = {
              score: prev.score,
              time: GAME_TIME,
              completedAt: Date.now(),
            };
            localStorage.setItem('lastGameResult', JSON.stringify(gameResult));
            
            return {
              ...prev,
              phase: 'ended',
              timeLeft: 0,
              endTime: Date.now(),
            };
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.phase, gameState.timeLeft]);

  if (gameState.phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-400 mb-2">REDDIMPOSTERS</h1>
            <p className="text-gray-300">Find the hidden alien impostors!</p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2">🎯 Objective</h3>
              <p className="text-sm text-gray-300">Find all 3 alien impostors hidden in the crowd!</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2">⏱️ Time Limit</h3>
              <p className="text-sm text-gray-300">You have 2 minutes to find them all.</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2">🏆 Scoring</h3>
              <p className="text-sm text-gray-300">100 points per impostor + time bonus!</p>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🚀 START HUNTING
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'playing') {
    return (
      <GameBoard
        gameState={gameState}
        onFindImpostor={findImpostor}
      />
    );
  }

  return (
    <GameResults
      gameState={gameState}
      onPlayAgain={playAgain}
    />
  );
};