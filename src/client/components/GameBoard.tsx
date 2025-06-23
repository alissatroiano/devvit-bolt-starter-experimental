import React from 'react';
import { GameState, Player } from '../../shared/types/game';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onCompleteTask: () => Promise<boolean>;
  onCallEmergencyMeeting: () => Promise<void>;
  onEliminatePlayer: (targetId: string) => Promise<void>;
  error: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayer,
  onCompleteTask,
  onCallEmergencyMeeting,
  onEliminatePlayer,
  error,
}) => {
  const players = Object.values(gameState.players);
  const alivePlayers = players.filter(p => p.status === 'alive');
  const deadPlayers = players.filter(p => p.status === 'dead');
  
  const handleCompleteTask = async () => {
    const completed = await onCompleteTask();
    if (completed && currentPlayer) {
      // Show success feedback
    }
  };

  const handleEliminate = (targetId: string) => {
    if (currentPlayer?.role === 'impostor' && currentPlayer.status === 'alive') {
      onEliminatePlayer(targetId);
    }
  };

  const isImpostor = currentPlayer?.role === 'impostor';
  const isAlive = currentPlayer?.status === 'alive';
  const canAct = isAlive && currentPlayer;

  // Calculate task progress
  const totalTasks = alivePlayers
    .filter(p => p.role === 'crewmate')
    .reduce((sum, p) => sum + p.totalTasks, 0);
  const completedTasks = alivePlayers
    .filter(p => p.role === 'crewmate')
    .reduce((sum, p) => sum + p.tasksCompleted, 0);
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Reddit Impostors</h1>
          <div className="text-right">
            {currentPlayer && (
              <div className="text-sm">
                <div className={`font-bold ${isImpostor ? 'text-red-400' : 'text-cyan-400'}`}>
                  You are {isImpostor ? 'an IMPOSTOR' : 'a CREWMATE'}
                </div>
                <div className="text-gray-400">
                  Status: {currentPlayer.status === 'alive' ? '🟢 Alive' : '💀 Dead'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Progress Bar */}
        {!isImpostor && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Crew Tasks Progress</span>
              <span>{completedTasks}/{totalTasks}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canAct && (
          <div className="flex gap-3">
            {!isImpostor && (
              <button
                onClick={handleCompleteTask}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                disabled={currentPlayer.tasksCompleted >= currentPlayer.totalTasks}
              >
                Complete Task ({currentPlayer.tasksCompleted}/{currentPlayer.totalTasks})
              </button>
            )}
            
            <button
              onClick={onCallEmergencyMeeting}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
            >
              🚨 Emergency Meeting
            </button>
          </div>
        )}
      </div>

      {/* Player Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Alive Players */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-green-400">Alive Players ({alivePlayers.length})</h2>
          {alivePlayers.map((player) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                player.id === currentPlayer?.id
                  ? 'bg-blue-600 bg-opacity-20 border-blue-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    player.role === 'impostor' && isImpostor ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{player.username}</div>
                    {player.id === currentPlayer?.id && (
                      <div className="text-sm text-gray-400">(You)</div>
                    )}
                    {isImpostor && player.role === 'impostor' && player.id !== currentPlayer?.id && (
                      <div className="text-sm text-red-400">(Fellow Impostor)</div>
                    )}
                  </div>
                </div>
                
                {isImpostor && canAct && player.id !== currentPlayer?.id && player.role !== 'impostor' && (
                  <button
                    onClick={() => handleEliminate(player.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                  >
                    🔪 Eliminate
                  </button>
                )}
              </div>
              
              {player.role === 'crewmate' && (
                <div className="mt-2">
                  <div className="text-sm text-gray-400 mb-1">
                    Tasks: {player.tasksCompleted}/{player.totalTasks}
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(player.tasksCompleted / player.totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dead Players */}
        {deadPlayers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-red-400">Eliminated ({deadPlayers.length})</h2>
            {deadPlayers.map((player) => (
              <div
                key={player.id}
                className="p-4 rounded-lg bg-gray-800 border-2 border-gray-700 opacity-75"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    💀
                  </div>
                  <div>
                    <div className="font-medium text-gray-300">{player.username}</div>
                    <div className="text-sm text-gray-500">
                      Was {player.role === 'impostor' ? 'an Impostor' : 'a Crewmate'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Game Info */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-400">Game Info</h2>
          <div className="p-4 bg-gray-700 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="text-gray-400">Phase:</span>
              <span className="ml-2 font-medium text-green-400">Playing</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Players:</span>
              <span className="ml-2 font-medium">{alivePlayers.length} alive, {deadPlayers.length} eliminated</span>
            </div>
            {gameState.gameStartTime && (
              <div className="text-sm">
                <span className="text-gray-400">Game Time:</span>
                <span className="ml-2 font-medium">
                  {Math.floor((Date.now() - gameState.gameStartTime) / 60000)}m
                </span>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium text-white mb-2">Objectives</h3>
            {isImpostor ? (
              <div className="text-sm text-red-300 space-y-1">
                <p>🔪 Eliminate crewmates</p>
                <p>🎭 Blend in during discussions</p>
                <p>🗳️ Avoid getting voted out</p>
              </div>
            ) : (
              <div className="text-sm text-cyan-300 space-y-1">
                <p>⚙️ Complete all tasks</p>
                <p>🕵️ Find the impostors</p>
                <p>🗳️ Vote out suspicious players</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 p-3 bg-red-600 bg-opacity-90 border border-red-500 rounded-lg text-red-100 text-sm max-w-sm">
          {error}
        </div>
      )}
    </div>
  );
};