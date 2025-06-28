import React, { useEffect, useState } from 'react';

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

interface GameResultsProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

interface SavedResult {
  score: number;
  time: number;
  completedAt: number;
}

export const GameResults: React.FC<GameResultsProps> = ({ gameState, onPlayAgain }) => {
  const [bestScore, setBestScore] = useState<SavedResult | null>(null);
  
  useEffect(() => {
    // Load best score from localStorage
    const saved = localStorage.getItem('bestGameResult');
    if (saved) {
      const savedResult = JSON.parse(saved) as SavedResult;
      setBestScore(savedResult);
    }
    
    // Check if current score is better
    const current = localStorage.getItem('lastGameResult');
    if (current) {
      const currentResult = JSON.parse(current) as SavedResult;
      if (!bestScore || currentResult.score > bestScore.score) {
        localStorage.setItem('bestGameResult', current);
        setBestScore(currentResult);
      }
    }
  }, [bestScore]);

  const foundCount = gameState.impostors.filter(imp => imp.found).length;
  const totalCount = gameState.impostors.length;
  const completionTime = gameState.startTime && gameState.endTime 
    ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
    : 0;
  
  const isNewRecord = bestScore && gameState.score > bestScore.score;
  const isComplete = foundCount === totalCount;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            {isComplete ? '🎉 MISSION COMPLETE!' : '⏰ TIME\'S UP!'}
          </h1>
          
          {isNewRecord && (
            <div className="text-2xl font-bold text-yellow-400 animate-pulse mb-4">
              🏆 NEW HIGH SCORE! 🏆
            </div>
          )}
          
          <div className="text-xl text-gray-300">
            {isComplete 
              ? 'All alien impostors have been captured!' 
              : 'The aliens got away this time...'}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="bg-gray-700/50 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{gameState.score}</div>
            <div className="text-gray-300">Final Score</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {foundCount}/{totalCount}
            </div>
            <div className="text-gray-300">Impostors Found</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {formatTime(completionTime)}
            </div>
            <div className="text-gray-300">Time Taken</div>
          </div>
          
          <div className="bg-gray-700/50 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {Math.round((foundCount / totalCount) * 100)}%
            </div>
            <div className="text-gray-300">Success Rate</div>
          </div>
        </div>

        {/* Best Score */}
        {bestScore && (
          <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
              🏆 Personal Best
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{bestScore.score}</div>
                <div className="text-sm text-gray-300">Best Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{formatTime(bestScore.time)}</div>
                <div className="text-sm text-gray-300">Best Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="bg-gray-700/30 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Score Breakdown</h3>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Impostors Found ({foundCount} × 100)</span>
              <span className="text-green-400">+{foundCount * 100}</span>
            </div>
            {isComplete && (
              <div className="flex justify-between">
                <span>Time Bonus ({gameState.timeLeft} seconds)</span>
                <span className="text-blue-400">+{gameState.timeLeft * 10}</span>
              </div>
            )}
            <div className="border-t border-gray-600 pt-2 flex justify-between font-bold">
              <span>Total Score</span>
              <span className="text-yellow-400">{gameState.score}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105"
          >
            🔄 Play Again
          </button>
          
          <button
            onClick={() => {
              const text = `I just scored ${gameState.score} points in Reddimposters! Found ${foundCount}/${totalCount} alien impostors in ${formatTime(completionTime)}. Can you beat my score?`;
              navigator.clipboard.writeText(text);
              alert('Score copied to clipboard!');
            }}
            className="px-6 py-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold transition-colors"
          >
            📋 Share Score
          </button>
        </div>
      </div>
    </div>
  );
};