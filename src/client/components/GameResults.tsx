import React from 'react';

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

interface GameResultsProps {
  gameState: GameState;
  impostors: Impostor[];
  onPlayAgain: () => void;
}

export const GameResults: React.FC<GameResultsProps> = ({
  gameState,
  impostors,
  onPlayAgain,
}) => {
  const foundCount = gameState.foundImpostors.length;
  const totalCount = impostors.length;
  const timeUsed = gameState.startTime && gameState.endTime 
    ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
    : 300 - gameState.timeLeft;
  
  const isComplete = foundCount === totalCount;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-[#1a1a2e]">
      <div className="max-w-2xl w-full bg-[#16213e] rounded-lg p-8 shadow-2xl border border-gray-700">
        {/* Game Over Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            {isComplete ? '🎉 MISSION COMPLETE!' : '⏰ TIME\'S UP!'}
          </h1>
          
          <div className={`text-3xl font-bold mb-4 ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
            {isComplete ? 'All Impostors Captured!' : 'Partial Success'}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-[#1a1a2e] rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4">Your Performance</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#ffd700]">{gameState.score}</div>
              <div className="text-sm text-gray-400">Final Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{foundCount}/{totalCount}</div>
              <div className="text-sm text-gray-400">Impostors Found</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{formatTime(timeUsed)}</div>
              <div className="text-sm text-gray-400">Time Used</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {Math.round((foundCount / totalCount) * 100)}%
              </div>
              <div className="text-sm text-gray-400">Completion</div>
            </div>
          </div>
        </div>

        {/* Found Impostors Gallery */}
        <div className="bg-[#1a1a2e] rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4">Captured Impostors</h2>
          <div className="grid grid-cols-3 gap-4">
            {impostors.map((impostor) => (
              <div
                key={impostor.id}
                className={`relative bg-gray-800 rounded-lg p-4 border-2 ${
                  gameState.foundImpostors.includes(impostor.id)
                    ? 'border-green-400 bg-green-900/20'
                    : 'border-gray-600 bg-gray-800/50'
                }`}
              >
                <div className="aspect-square flex items-center justify-center mb-2 text-6xl">
                  <span className={gameState.foundImpostors.includes(impostor.id) ? '' : 'grayscale opacity-50'}>
                    {impostor.emoji}
                  </span>
                </div>
                <div className="text-center">
                  {gameState.foundImpostors.includes(impostor.id) ? (
                    <div className="text-green-400 font-bold">✓ CAPTURED</div>
                  ) : (
                    <div className="text-gray-500">❌ ESCAPED</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-[#1a1a2e] rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4">Score Breakdown</h2>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Impostors Found ({foundCount} × 100)</span>
              <span className="text-green-400">+{foundCount * 100}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Bonus ({gameState.timeLeft} × 1)</span>
              <span className="text-blue-400">+{gameState.timeLeft}</span>
            </div>
            {isComplete && (
              <div className="flex justify-between">
                <span>Completion Bonus</span>
                <span className="text-purple-400">+{gameState.timeLeft}</span>
              </div>
            )}
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold">
                <span>Total Score</span>
                <span className="text-[#ffd700]">{gameState.score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Play Again Button */}
        <div className="text-center">
          <button
            onClick={onPlayAgain}
            className="py-4 px-8 bg-[#ffd700] hover:bg-yellow-500 rounded-lg font-semibold text-lg transition-colors text-black"
          >
            🔄 Hunt Again
          </button>
          <p className="mt-3 text-sm text-gray-400">
            {isComplete 
              ? 'Excellent work! Try to beat your time!' 
              : 'Can you find all the impostors next time?'
            }
          </p>
        </div>
      </div>
    </div>
  );
};