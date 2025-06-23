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
  const players = Object.values(gameState.players);
  const impostors = players.filter(p => p.role === 'impostor');
  const crewmates = players.filter(p => p.role === 'crewmate');
  const winner = gameState.winner;
  
  const isWinner = currentPlayer && (
    (winner === 'crewmates' && currentPlayer.role === 'crewmate') ||
    (winner === 'impostors' && currentPlayer.role === 'impostor')
  );

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg p-8 shadow-2xl">
        {/* Game Over Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">Game Over!</h1>
          
          <div className={`text-3xl font-bold mb-4 ${
            winner === 'crewmates' ? 'text-cyan-400' : 'text-red-400'
          }`}>
            {winner === 'crewmates' ? '🚀 Crewmates Win!' : '🔪 Impostors Win!'}
          </div>
          
          {currentPlayer && (
            <div className={`text-xl ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
              {isWinner ? '🎉 You Won!' : '💀 You Lost!'}
            </div>
          )}
        </div>

        {/* Win Condition */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-3">How the game ended:</h2>
          <p className="text-gray-300">
            {winner === 'crewmates' 
              ? '✅ All tasks were completed or all impostors were eliminated!'
              : '⚡ Impostors eliminated enough crewmates to take control!'
            }
          </p>
        </div>

        {/* Player Results */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Crewmates */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-cyan-400 mb-4">
              🚀 Crewmates ({crewmates.length})
            </h2>
            {crewmates.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.status === 'alive'
                    ? 'bg-cyan-600 bg-opacity-20 border-cyan-500'
                    : 'bg-gray-700 border-gray-600'
                } ${
                  player.id === currentPlayer?.id ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.status === 'alive' ? '👤' : '💀'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{player.username}</div>
                      {player.id === currentPlayer?.id && (
                        <div className="text-sm text-gray-400">(You)</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className={player.status === 'alive' ? 'text-green-400' : 'text-red-400'}>
                      {player.status === 'alive' ? 'Survived' : 'Eliminated'}
                    </div>
                    <div className="text-gray-400">
                      Tasks: {player.tasksCompleted}/{player.totalTasks}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Impostors */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              🔪 Impostors ({impostors.length})
            </h2>
            {impostors.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.status === 'alive'
                    ? 'bg-red-600 bg-opacity-20 border-red-500'
                    : 'bg-gray-700 border-gray-600'
                } ${
                  player.id === currentPlayer?.id ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.status === 'alive' ? '🔪' : '💀'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{player.username}</div>
                      {player.id === currentPlayer?.id && (
                        <div className="text-sm text-gray-400">(You)</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className={player.status === 'alive' ? 'text-green-400' : 'text-red-400'}>
                      {player.status === 'alive' ? 'Survived' : 'Caught'}
                    </div>
                    <div className="text-gray-400">Impostor</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Game Statistics</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{players.length}</div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{crewmates.length}</div>
              <div className="text-sm text-gray-400">Crewmates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{impostors.length}</div>
              <div className="text-sm text-gray-400">Impostors</div>
            </div>
          </div>
          
          {gameState.gameStartTime && (
            <div className="mt-4 text-center">
              <div className="text-xl font-bold text-yellow-400">
                {Math.floor((Date.now() - gameState.gameStartTime) / 60000)}m {Math.floor(((Date.now() - gameState.gameStartTime) % 60000) / 1000)}s
              </div>
              <div className="text-sm text-gray-400">Game Duration</div>
            </div>
          )}
        </div>

        {/* Play Again Button */}
        <div className="text-center">
          <button
            onClick={onPlayAgain}
            className="py-4 px-8 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
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