import React from 'react';
import { GameState, Player } from '../../shared/types/game';

interface GameResultsProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onPlayAgain: () => void;
}

export const GameResults: React.FC<GameResultsProps> = ({
  gameState,
  currentPlayer,
  onPlayAgain,
}) => {
  const winner = gameState.winner ? gameState.players[gameState.winner] : null;
  const isWinner = currentPlayer && gameState.winner === currentPlayer.id;
  const playerRank = gameState.leaderboard.findIndex(p => p.playerId === currentPlayer?.id) + 1;

  const formatTime = (ms?: number) => {
    if (!ms || !gameState.gameStartTime) return 'N/A';
    const seconds = Math.floor((ms - gameState.gameStartTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-gray-900">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg p-8 shadow-2xl">
        {/* Game Over Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">Game Over!</h1>
          
          {winner && (
            <div className="text-3xl font-bold mb-4 text-yellow-400">
              🏆 {winner.username} Wins!
            </div>
          )}
          
          {currentPlayer && (
            <div className={`text-xl ${isWinner ? 'text-green-400' : 'text-blue-400'}`}>
              {isWinner ? '🎉 Congratulations! You won!' : `You finished in ${playerRank}${playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th'} place!`}
            </div>
          )}
        </div>

        {/* Player Stats */}
        {currentPlayer && (
          <div className="bg-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Your Performance</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{currentPlayer.score}</div>
                <div className="text-sm text-gray-400">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{currentPlayer.foundImpostors.length}</div>
                <div className="text-sm text-gray-400">Impostors Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">#{playerRank}</div>
                <div className="text-sm text-gray-400">Final Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {formatTime(currentPlayer.timeCompleted)}
                </div>
                <div className="text-sm text-gray-400">Completion Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Final Leaderboard */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Final Leaderboard</h2>
          <div className="space-y-3">
            {gameState.leaderboard.map((entry, index) => (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  entry.playerId === currentPlayer?.id
                    ? 'bg-blue-600 bg-opacity-30 border border-blue-500'
                    : 'bg-gray-600'
                } ${
                  index < 3 ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-gray-500'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{entry.username}</div>
                    {entry.playerId === currentPlayer?.id && (
                      <div className="text-sm text-blue-400">(You)</div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-white">{entry.score} pts</div>
                  <div className="text-sm text-gray-400">
                    {gameState.players[entry.playerId]?.foundImpostors.length || 0}/{gameState.impostors.length} found
                  </div>
                  {entry.timeCompleted && (
                    <div className="text-sm text-gray-400">
                      {formatTime(entry.timeCompleted)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Statistics */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Game Statistics</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{Object.keys(gameState.players).length}</div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{gameState.impostors.length}</div>
              <div className="text-sm text-gray-400">Total Impostors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {gameState.impostors.filter(i => i.found).length}
              </div>
              <div className="text-sm text-gray-400">Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {gameState.gameStartTime && gameState.gameEndTime 
                  ? Math.floor((gameState.gameEndTime - gameState.gameStartTime) / 1000)
                  : 0}s
              </div>
              <div className="text-sm text-gray-400">Game Duration</div>
            </div>
          </div>
        </div>

        {/* Play Again Button */}
        <div className="text-center">
          <button
            onClick={onPlayAgain}
            className="py-4 px-8 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg transition-colors"
          >
            🔄 Play Again
          </button>
          <p className="mt-3 text-sm text-gray-400">
            This will refresh the page and create a new game
          </p>
        </div>
      </div>
    </div>
  );
};